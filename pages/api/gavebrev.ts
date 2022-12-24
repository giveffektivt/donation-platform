import type { NextApiRequest, NextApiResponse } from "next";
import {
  processGavebrev,
  SubmitDataGavebrev,
  validationSchemaGavebrev,
} from "src";
import * as yup from "yup";

type Data = {
  message: string;
  agreementId?: string;
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

    if (!process.env.GAVEBREV_API_KEY) {
      throw new Error("GAVEBREV_API_KEY is not defined");
    }

    if (
      req.headers.authorization !== `Bearer ${process.env.GAVEBREV_API_KEY}`
    ) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    let submitData: SubmitDataGavebrev = await yup
      .object()
      .shape(validationSchemaGavebrev)
      .validate(req.body);

    const agreementId = await processGavebrev(submitData);

    res.status(200).json({
      message: "OK",
      agreementId,
    });
  } catch (err) {
    console.error("api/donation:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
}
