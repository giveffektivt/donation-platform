import {
  getBankAccount,
  logError,
  PaymentGateway,
  PaymentMethod,
  parsePaymentMethod,
  processBankTransferDonation,
  processQuickpayDonation,
  type SubmitDataDonation,
  SubscribeToNewsletter,
  validationSchemaDonation,
} from "src";
import * as yup from "yup";

type Data = {
  message: string;
  redirect?: string;
  bank?: { account: string; message: string };
};

export async function POST(req: Request) {
  try {
    // Trust the usual proxy headers (assumes we are running on a reverse proxy that promises to overwrite these values).
    const ip: string =
      req.headers.get("X-Real-IP") ??
      req.headers.get("X-Forwarded-for") ??
      "no ip";

    const blockedIps = process.env.BLOCKED_IPS
      ? process.env.BLOCKED_IPS.split(",")
      : [];

    if (blockedIps.includes(ip)) {
      throw new Error(`Blocked IP address: ${ip}`);
    }

    const submitData: SubmitDataDonation = await yup
      .object()
      .shape(validationSchemaDonation)
      .validate(await req.json());

    const [response, donorId] = await processPayment(submitData);

    if (submitData.subscribeToNewsletter) {
      try {
        await SubscribeToNewsletter(submitData.email);
      } catch (err) {
        logError(
          `api/donation: Error subscribing ${donorId} to newsletter`,
          err,
        );
      }
    }

    return Response.json(response);
  } catch (err) {
    logError("api/donation:", err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
}

async function processPayment(
  submitData: SubmitDataDonation,
): Promise<[Data, string]> {
  switch (parsePaymentMethod(submitData.method)) {
    case PaymentMethod.BankTransfer: {
      const [bankTransferId, donorId] =
        await processBankTransferDonation(submitData);
      return [
        {
          message: "OK",
          bank: {
            account: getBankAccount(),
            message: bankTransferId,
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

        default:
          throw new Error(
            `api/donation: PAYMENT_GATEWAY '${process.env.PAYMENT_GATEWAY}' is unable to process payment method '${submitData.method}'`,
          );
      }
  }
}
