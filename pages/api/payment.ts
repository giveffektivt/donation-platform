import type { NextApiRequest, NextApiResponse } from "next";
import {
  parsePaymentMethod,
  PaymentGateway,
  PaymentMethod,
  processBankTransferPayment,
  processQuickpayPayment,
  processScanpayPayment,
  SubmitData,
  validationSchema,
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
 * 2. Requests link from payment gateway for credit card or MobilePay, otherwise returns bank transfer info
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

    let submitData: SubmitData = await yup
      .object()
      .shape(validationSchema)
      .validate(req.body);

    const [response, donorId] = await processPayment(submitData, ip);

    if (submitData.subscribeToNewsletter) {
      await subscribeToNewsletter(submitData, donorId);
    }

    res.status(200).json(response);
  } catch (err) {
    console.error("api/payment:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
}

function getMailchimpAuthorizationHeader() {
  if (!process.env.MAILCHIMP_API_KEY) {
    throw new Error(`No Mailchimp API key defined`);
  }

  const base64key = Buffer.from(
    `key:${process.env.MAILCHIMP_API_KEY}`
  ).toString("base64");
  return `Basic ${base64key}`;
}

async function processPayment(
  submitData: SubmitData,
  ip: string
): Promise<[Data, string]> {
  switch (parsePaymentMethod(submitData.method)) {
    case PaymentMethod.BankTransfer: {
      const [bankTransferId, donorId] = await processBankTransferPayment(
        submitData
      );
      return [
        {
          message: "OK",
          bank: {
            account: "5351-0242661",
            message: `d-${bankTransferId}`,
          },
        },
        donorId,
      ];
    }

    case PaymentMethod.CreditCard:
    case PaymentMethod.MobilePay:
      switch (process.env.PAYMENT_GATEWAY) {
        case PaymentGateway.Quickpay: {
          const [redirect, donorId] = await processQuickpayPayment(submitData);
          return [
            {
              message: "OK",
              redirect,
            },
            donorId,
          ];
        }

        case PaymentGateway.Scanpay: {
          const [redirect, donorId] = await processScanpayPayment(
            submitData,
            ip
          );
          return [
            {
              message: "OK",
              redirect,
            },
            donorId,
          ];
        }

        default:
          throw new Error(
            `api/payment: PAYMENT_GATEWAY '${process.env.PAYMENT_GATEWAY}' is unable to process payment method '${submitData.method}'`
          );
      }
  }
}

async function subscribeToNewsletter(submitData: SubmitData, donorId: string) {
  if (!process.env.MAILCHIMP_SUBSCRIBE_URL) {
    throw new Error(`No Mailchimp subscribe URL defined`);
  }

  const response = await fetch(process.env.MAILCHIMP_SUBSCRIBE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getMailchimpAuthorizationHeader(),
    },
    body: JSON.stringify({
      email_address: submitData.email,
      status: "subscribed",
    }),
  });

  if (!response.ok) {
    console.error(
      `Error subscribing ${donorId} to newsletter: ${
        response.statusText
      }: ${await response.text()}`
    );
  }
}
