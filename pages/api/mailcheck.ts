import type { NextApiRequest, NextApiResponse } from "next";
import { sendFailedRecurringDonationEmailsTest } from "src/donation/failed";

type Data = {
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      res.status(405).end("Method Not Allowed");
      return;
    }

    if (!process.env.FAILED_RECURRING_DONATIONS_API_KEY) {
      throw new Error("FAILED_RECURRING_DONATIONS_API_KEY is not defined");
    }

    if (
      req.headers.authorization !==
      `Bearer ${process.env.FAILED_RECURRING_DONATIONS_API_KEY}`
    ) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    await sendFailedRecurringDonationEmailsTest(req.body);

    res.status(200).json({ message: "OK" });
  } catch (err) {
    console.error("api/failed-recurring-donations:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
}
