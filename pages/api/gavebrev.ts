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
  agreementIdQR?: string;
  errors?: object;
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
      return res.status(401).json({ message: "Unauthorized" });
    }

    let submitData: SubmitDataGavebrev | null = null;
    try {
      submitData = await yup
        .object()
        .shape(validationSchemaGavebrev, [
          ["percentageOrAmount", "percentage"],
          ["percentageOrAmount", "amount"],
          ["percentage", "amount"],
        ])
        .validate(req.body);
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        return res
          .status(400)
          .json({ message: "Validation failed", errors: err.errors });
      } else {
        throw err;
      }
    }

    const agreementId = await processGavebrev(submitData);
    const agreementIdQR = `https://quickchart.io/qr?text=${agreementId}&dark=921233&margin=0&size=150&format=svg`;

    res.status(200).json({
      message: "OK",
      agreementId,
      agreementIdQR,
    });
  } catch (err) {
    console.error("api/gavebrev:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
}
