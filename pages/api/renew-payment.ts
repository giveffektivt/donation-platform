import type { NextApiRequest, NextApiResponse } from "next";
import {
  cors,
  getRenewPaymentLink,
  SubmitDataRenewPayment,
  validationSchemaRenewPayment,
} from "src";
import * as yup from "yup";

type Data = {
  message: string;
  url?: string;
  errors?: object;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    await cors(req, res);

    if (req.method !== "POST") {
      console.error(
        `api/renew-payment: attempted to access renew payment with HTTP method '${req.method}'`
      );
      res.setHeader("Allow", "POST");
      res.status(405).end("Method Not Allowed");
      return;
    }

    let submitData: SubmitDataRenewPayment | null = null;
    try {
      submitData = await yup
        .object()
        .shape(validationSchemaRenewPayment)
        .validate(req.body);
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        console.error(
          "api/renew-payment: Validation failed for request body: ",
          err
        );
        return res
          .status(400)
          .json({ message: "Validation failed", errors: err.errors });
      } else {
        throw err;
      }
    }

    const url = await getRenewPaymentLink(submitData.id);

    if (url == null) {
      console.error(
        `api/renew-payment: attempted to renew payment on donation '${submitData.id}' that doesn't allow it`
      );
      return res.status(404).json({ message: "Not found" });
    }

    res.status(200).json({ message: "OK", url });
  } catch (err) {
    console.error("api/renew-payment:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
}
