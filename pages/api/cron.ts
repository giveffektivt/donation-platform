import type { NextApiRequest, NextApiResponse } from "next";
import { charge, sendNewEmails } from "src";

type Data = {
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      res.status(405).end("Method Not Allowed");
      return;
    }

    if (!process.env.CRON_API_KEY) {
      throw new Error("CRON_API_KEY is not defined");
    }

    if (req.headers.authorization !== `Bearer ${process.env.CRON_API_KEY}`) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    await charge();
    await sendNewEmails();

    res.status(200).json({ message: "OK" });
  } catch (err) {
    console.error("api/cron:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
}
