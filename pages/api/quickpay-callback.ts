import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";
import {
  charge,
  dbClient,
  QuickpayChange,
  quickpayHandleChange,
  sendNewEmails,
} from "src";

type Data = {
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const db = await dbClient();
  try {
    try {
      if (
        !process.env.QUICKPAY_DONATION_PRIVATE_KEY ||
        !process.env.QUICKPAY_MEMBERSHIP_PRIVATE_KEY
      ) {
        throw new Error("Quickpay private keys are not defined");
      }

      const body = await getRawBody(req, {
        length: req.headers["content-length"],
        limit: "1mb",
        encoding: "utf-8",
      });

      // Validate that the request comes from Quickpay
      const donationHash = crypto
        .createHmac("sha256", process.env.QUICKPAY_DONATION_PRIVATE_KEY)
        .update(body)
        .digest("hex");

      const membershipHash = crypto
        .createHmac("sha256", process.env.QUICKPAY_MEMBERSHIP_PRIVATE_KEY)
        .update(body)
        .digest("hex");

      const bodyHash = req.headers["quickpay-checksum-sha256"];

      if (bodyHash !== donationHash && bodyHash !== membershipHash) {
        throw new Error("Quickpay callback has invalid signature");
      }

      // Process the change
      await quickpayHandleChange(db, JSON.parse(body));

      // Process new donations that just happened
      await charge();
      await sendNewEmails();

      res.status(200).json({ message: "OK" });
    } catch (err) {
      console.error("api/quickpay-callback:", err);
      res.status(500).json({ message: "Something went wrong" });
    }
  } finally {
    db.release();
  }
}

export const config = {
  api: {
    bodyParser: false, // To verify the raw body of a webhook request
  },
};
