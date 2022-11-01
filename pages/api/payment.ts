import type { NextApiRequest, NextApiResponse } from "next";
import {
  BankTransferInfo,
  DonationRecipient,
  DonationToEmail,
  parseDonationFrequency,
  parseDonationRecipient,
  parsePaymentMethod,
  PaymentMethod,
  sendMembershipEmail,
  sendPaymentEmail,
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

    const bankTransferId = "1234";
    const donationToEmail: DonationToEmail = {
      id: "some-donation-id",
      email: submitData.email,
      amount: submitData.amount,
      recipient: parseDonationRecipient(submitData.recipient),
      frequency: parseDonationFrequency(submitData.subscription),
      tax_deductible: submitData.taxDeduction,
      country: "Denmark",
    };

    switch (parsePaymentMethod(submitData.method)) {
      case PaymentMethod.BankTransfer:
        const bankTransferInfo: BankTransferInfo = {
          amount: submitData.amount,
          msg: bankTransferId,
        };

        await sendPaymentEmail(donationToEmail, bankTransferInfo);

        res.status(200).json({
          message: "OK",
          bank: {
            account: "5351-0242661",
            message: `d-${bankTransferId}`,
          },
        });
        return;

      case PaymentMethod.CreditCard:
      case PaymentMethod.MobilePay:
        const isMembership =
          parseDonationRecipient(submitData.recipient) ===
          DonationRecipient.GivEffektivt;

        if (isMembership) {
          await sendMembershipEmail(donationToEmail);
        } else {
          await sendPaymentEmail(donationToEmail);
        }
        res.status(200).json({
          message: "OK",
          redirect: isMembership
            ? process.env.SUCCESS_URL_MEMBERSHIP_ONLY
            : process.env.SUCCESS_URL,
        });
        return;
    }
  } catch (err) {
    console.error("api/payment:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
}
