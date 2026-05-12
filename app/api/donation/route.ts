import {
  DonationFrequency,
  DonationRecipient,
  getBankAccount,
  logError,
  type NewDonation,
  PaymentMethod,
  processBankTransferDonation,
  processQuickpayDonation,
  SubscribeToNewsletter,
} from "src";
import { z } from "zod";

type Data = {
  message: string;
  redirect?: string;
  bank?: { account: string; message: string };
};

const PayloadSchema = z
  .object({
    amount: z.coerce.number().transform(Math.round),
    recipient: z.enum(DonationRecipient),
    frequency: z.enum(DonationFrequency),
    taxDeductible: z.boolean(),
    tin: z.preprocess(
      (val) => (!val ? undefined : val),
      z
        .string()
        .regex(/^(\d{6}-?\d{4}|\d{8})$/)
        .transform((s) => s.replace(/^(\d{6})(\d{4})$/, "$1-$2"))
        .optional(),
    ),
    email: z.email().max(500),
    method: z.enum(PaymentMethod),
    rulesAccepted: z.literal(true),
    subscribeToNewsletter: z.boolean(),
    fundraiserId: z.preprocess(
      (val) => (!val ? undefined : val),
      z.string().optional(),
    ),
    publicMessageAuthor: z.boolean().optional().default(false),
    messageAuthor: z.preprocess(
      (val) => (!val ? undefined : val),
      z.string().max(100).optional(),
    ),
    message: z.preprocess(
      (val) => (!val ? undefined : val),
      z.string().max(500).optional(),
    ),
  })
  .refine(
    (data) =>
      data.frequency === DonationFrequency.Match
        ? data.amount > 0
        : data.amount >= 1,
    { path: ["amount"] },
  )
  .refine((data) => !data.taxDeductible || !!data.tin, {
    path: ["tin"],
    error: "tin is required for tax deductions",
  })
  .transform(({ recipient, ...rest }) => ({
    ...rest,
    earmarks: [{ recipient, percentage: 100 }],
  }));

export async function POST(req: Request) {
  try {
    const submitData = await PayloadSchema.parseAsync(await req.json());

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

async function processPayment(payload: NewDonation): Promise<[Data, string]> {
  switch (payload.method) {
    case PaymentMethod.BankTransfer: {
      const [bankTransferId, donorId] =
        await processBankTransferDonation(payload);
      return [
        {
          message: "OK",
          bank: { account: getBankAccount(), message: bankTransferId },
        },
        donorId,
      ];
    }

    case PaymentMethod.CreditCard:
    case PaymentMethod.MobilePay: {
      const [redirect, donorId] = await processQuickpayDonation(payload);
      return [{ message: "OK", redirect }, donorId];
    }
  }
}
