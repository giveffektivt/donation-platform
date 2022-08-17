import type { NextApiRequest, NextApiResponse } from "next";
import {
  parsePaymentMethod,
  PaymentMethod,
  processBankTransferPayment,
  processEnPayment,
  SubmitData,
  validationSchemaEn,
  EnSubmitData,
} from "src";
import * as yup from "yup";

type Data = {
  message: string;
  redirect?: string;
  bank?: { account: string; message: string };
};

const firstElementOrString = (x: any) => {
  if (typeof x === "object") {
    return x[0];
  } else {
    return x;
  }
};

/**
 * 1. Creates donor record and maybe donor subscription, charges, membership, payment or bank_transfer
 * 2. Requests link from Scanpay for credit card or MobilePay, otherwise returns bank transfer info
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    // Trust the usual proxy headers (assumes we are running on a reverse proxy that promises to overwrite these values).
    const ip: string =
      firstElementOrString(req.headers["x-real-ip"]) ||
      firstElementOrString(req.headers["x-forwarded-for"]) ||
      req.socket.remoteAddress ||
      "no ip";

    let submitData: EnSubmitData = await yup
      .object()
      .shape(validationSchemaEn)
      .validate(req.body);

    const redirectUrl = await processEnPayment(submitData, ip);
    res.status(200).json({
      message: "OK",
      redirect: redirectUrl,
    });
    return;
  } catch (err) {
    console.error("api/payment:", err);
    //res.status(500).json({ message: "Something went wrong" });
  }
}
