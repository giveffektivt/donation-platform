import type { NextApiRequest, NextApiResponse } from "next";
import {
  cors,
  parsePaymentMethod,
  PaymentGateway,
  PaymentMethod,
  processBankTransferDonation,
  processQuickpayDonation,
  processScanpayDonation,
  SubmitDataDonation,
  validationSchemaDonation,
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  try {
    await cors(req, res);

    // Trust the usual proxy headers (assumes we are running on a reverse proxy that promises to overwrite these values).
    const ip: string =
      firstElementOrString(req.headers["x-real-ip"]) ||
      firstElementOrString(req.headers["x-forwarded-for"]) ||
      req.socket.remoteAddress ||
      "no ip";

    const blockedIps = process.env.BLOCKED_IPS
      ? process.env.BLOCKED_IPS.split(",")
      : [];

    if (blockedIps.includes(ip)) {
      throw new Error("Blocked IP address: " + ip);
    }

    let submitData: SubmitDataDonation = await yup
      .object()
      .shape(validationSchemaDonation)
      .validate(req.body);

    const [response, donorId] = await processPayment(submitData, ip);

    if (submitData.subscribeToNewsletter) {
      await subscribeToNewsletter(submitData, donorId);
    }

    res.status(200).json(response);
  } catch (err) {
    console.error("api/donation:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
}

async function processPayment(
  submitData: SubmitDataDonation,
  ip: string,
): Promise<[Data, string]> {
  switch (parsePaymentMethod(submitData.method)) {
    case PaymentMethod.BankTransfer: {
      const [bankTransferId, donorId] =
        await processBankTransferDonation(submitData);
      return [
        {
          message: "OK",
          bank: {
            account: "5351-0000242661",
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
          const [redirect, donorId] = await processQuickpayDonation(submitData);
          return [
            {
              message: "OK",
              redirect,
            },
            donorId,
          ];
        }

        case PaymentGateway.Scanpay: {
          const [redirect, donorId] = await processScanpayDonation(
            submitData,
            ip,
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
            `api/donation: PAYMENT_GATEWAY '${process.env.PAYMENT_GATEWAY}' is unable to process payment method '${submitData.method}'`,
          );
      }
  }
}

async function subscribeToNewsletter(
  submitData: SubmitDataDonation,
  donorId: string,
) {
  if (!process.env.PIPEDRIVE_API_URL) {
    throw new Error("No Pipedrive API URL defined");
  }
  if (!process.env.PIPEDRIVE_API_KEY) {
    throw new Error("No Pipedrive API key defined");
  }

  const searchResult = await fetch(
    `${process.env.PIPEDRIVE_API_URL}/api/v2/persons/search?fields=email&exact_match=true&term=${submitData.email}`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Api-Token": process.env.PIPEDRIVE_API_KEY,
      },
    },
  );

  if (!searchResult.ok) {
    console.error(
      `Error subscribing ${donorId} to newsletter: search failed, ${searchResult.statusText}`,
    );
    return;
  }

  const id = (await searchResult.json())?.data?.items?.[0]?.item?.id;
  if (id) {
    const response = await fetch(
      `${process.env.PIPEDRIVE_API_URL}/api/v2/persons/${id}?include_fields=marketing_status`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Api-Token": process.env.PIPEDRIVE_API_KEY,
        },
      },
    );

    if (!response.ok) {
      console.error(
        `Error subscribing ${donorId} to newsletter: get failed, ${response.statusText}`,
      );
      return;
    }

    const status = (await response.json())?.data?.marketing_status;
    if (status !== "subscribed") {
      console.error(
        `Donor ${donorId} previously unsubscribed but now wants to subscribe to newsletter again, this required manual action`,
      );
    }
    return;
  }

  const response = await fetch(
    `${process.env.PIPEDRIVE_API_URL}/api/v2/persons`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Token": process.env.PIPEDRIVE_API_KEY,
      },
      body: JSON.stringify({
        name: "Unknown",
        emails: [{ value: submitData.email, primary: true }],
        marketing_status: "subscribed",
      }),
    },
  );

  if (!response.ok) {
    console.error(
      `Error subscribing ${donorId} to newsletter: post failed, ${response.statusText}`,
    );
  }
}
