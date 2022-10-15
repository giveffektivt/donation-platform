import type { NextApiRequest, NextApiResponse } from "next";
import {
  charge,
  dbClient,
  getLatestScanpaySeq,
  handleChange,
  insertScanpaySeq,
  lockScanpaySeq,
  sendNewEmails,
  unlockScanpaySeq,
} from "src";

const scanpay = require("scanpay")(process.env.SCANPAY_KEY);

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
      // Validate that the request comes from Scanpay
      await scanpay.sync.parsePing(
        JSON.stringify(req.body),
        req.headers["x-signature"]
      );

      // Obtain an exclusive lock for scanpay_seq table
      await lockScanpaySeq(db);

      // All the seq numbers are stored in database. The most recent one represents the place
      // where we are in the string of changes send by Scanpay
      const dbSeq = await getLatestScanpaySeq(db);

      // Pull latest changes from Scanpay since the last known seq
      const { changes, seq: scanpaySeq } = await scanpay.sync.pull(dbSeq, {
        hostname: process.env.SCANPAY_HOSTNAME,
      });

      // Process all the new changes
      if (changes.length > 0) {
        console.log(
          `Processing ${changes.length} Scanpay changes (seq ${dbSeq} -> ${scanpaySeq})`
        );

        for (let change of changes) {
          await handleChange(db, change);
        }
      }

      // Save new seq to DB
      if (dbSeq !== scanpaySeq) {
        await insertScanpaySeq(db, scanpaySeq);
      }

      // Process new donations that just happened
      await charge();
      await sendNewEmails();

      res.status(200).json({ message: "OK" });
    } catch (err) {
      console.error("api/ping:", err);
      res.status(500).json({ message: "Something went wrong" });
    } finally {
      await unlockScanpaySeq(db);
    }
  } finally {
    db.release();
  }
}
