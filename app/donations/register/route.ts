import {
  DonationFrequency,
  getBankAccount,
  logError,
  parsePaymentMethod,
  PaymentGateway,
  PaymentMethod,
  processBankTransferDonation,
  processQuickpayDonation,
  type SubmitDataDonation,
  type SubmitDataDonationRegister,
  SubscribeToNewsletter,
} from "src";

type Data = {
  message: string;
  redirect?: string;
  bank?: { account: string; message: string };
};

export async function POST(req: Request) {
  try {
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

    const submitData: SubmitDataDonationRegister = await req.json();

    const submitDataOld = {
      amount:
        typeof submitData.amount === "string"
          ? Number.parseFloat(submitData.amount)
          : submitData.amount,
      recipient: "Giv Effektivts anbefaling",
      frequency: submitData.recurring
        ? DonationFrequency.Monthly
        : DonationFrequency.Once,
      taxDeductible: submitData.donor.taxDeduction ?? false,
      tin: submitData.donor.ssn,
      email: submitData.donor.email,
      method: "Bank transfer",
      subscribeToNewsletter: submitData.donor.newsletter,
    };

    const [response, donorId] = await processPayment(submitDataOld);

    if (submitDataOld.subscribeToNewsletter) {
      try {
        await SubscribeToNewsletter(submitDataOld.email);
      } catch (err) {
        logError(
          `donation/register: Error subscribing ${donorId} to newsletter`,
          err,
        );
      }
    }

    return Response.json({
      status: 200,
      content: {
        KID: "TODO",
        donorID: donorId,
        hasAnsweredReferral: false,
        paymentProviderUrl: response.redirect,
        swishOrderID: response.bank?.account,
        swishPaymentRequestToken: response.bank?.message,
      },
    });
  } catch (err) {
    logError("donation/register:", err);
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
            account: getBankAccount(submitData.recipient),
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
            `donation/register: PAYMENT_GATEWAY '${process.env.PAYMENT_GATEWAY}' is unable to process payment method '${submitData.method}'`,
          );
      }
  }
}
