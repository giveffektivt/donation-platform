import {
  DonationFrequency,
  logError,
  mapFromNorwegianOrgId,
  mapFromNorwegianPaymentMethods,
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
  bankMsg?: string;
};

const PayloadSchema = z
  .object({
    distributionCauseAreas: z
      .array(
        z
          .object({
            amount: z.coerce.number().int().positive(),
            organizations: z
              .array(
                z
                  .object({
                    id: z.number().transform(mapFromNorwegianOrgId),
                    amount: z.coerce.number().int().positive(),
                  })
                  .transform(({ id, amount }) => ({ recipient: id, amount })),
              )
              .min(1),
          })
          .refine(
            (area) =>
              Math.abs(
                area.organizations.reduce(
                  (sum, organization) => sum + organization.amount,
                  0,
                ) - area.amount,
              ) <= 1,
            {
              path: ["organizations"],
              error: "organizations must sum to cause area amount",
            },
          ),
      )
      .min(1),
    donor: z.object({
      email: z.email().max(500),
      taxDeduction: z.boolean().optional().default(false),
      newsletter: z.boolean(),
      ssn: z.preprocess(
        (val) => (!val ? undefined : val),
        z
          .string()
          .regex(/^(\d{6}-?\d{4}|\d{8})$/)
          .transform((s) => s.replace(/^(\d{6})(\d{4})$/, "$1-$2"))
          .optional(),
      ),
    }),
    fundraiser: z
      .object({
        id: z.uuid(),
        message: z.preprocess(
          (val) => (!val ? undefined : val),
          z.string().max(500).optional(),
        ),
        messageSenderName: z.preprocess(
          (val) => (!val ? undefined : val),
          z.string().max(100).optional(),
        ),
        showName: z.boolean().optional().default(false),
      })
      .optional(),
    method: z.number().transform(mapFromNorwegianPaymentMethods),
    recurring: z.coerce.boolean(),
    amount: z.coerce.number().int().positive(),
  })
  .refine((data) => !data.donor.taxDeduction || !!data.donor.ssn, {
    path: ["ssn"],
    error: "ssn is required for tax deductions",
  })
  .refine(
    (data) =>
      Math.abs(
        data.distributionCauseAreas.reduce(
          (sum, area) => sum + area.amount,
          0,
        ) - data.amount,
      ) <= 1,
    {
      path: ["distributionCauseAreas"],
      error: "cause areas must sum to donation amount",
    },
  )
  .transform((data) => {
    const earmarks = data.distributionCauseAreas.flatMap(
      (area) => area.organizations,
    );
    return {
      amount: earmarks.reduce((sum, earmark) => sum + earmark.amount, 0),
      frequency: data.recurring
        ? DonationFrequency.Monthly
        : DonationFrequency.Once,
      taxDeductible: data.donor.taxDeduction,
      tin: data.donor.ssn,
      email: data.donor.email,
      method: data.method,
      earmarks,
      subscribeToNewsletter: data.donor.newsletter,
      fundraiserId: data.fundraiser?.id,
      publicMessageAuthor: data.fundraiser?.showName,
      messageAuthor: data.fundraiser?.messageSenderName,
      message: data.fundraiser?.message,
    };
  });

export async function POST(req: Request) {
  try {
    const submitData = await PayloadSchema.parseAsync(await req.json());

    const [response, donorId] = await processPayment(submitData);

    if (submitData.subscribeToNewsletter) {
      try {
        await SubscribeToNewsletter(submitData.email);
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
        donorID: donorId,
        hasAnsweredReferral: false,
        paymentProviderUrl: response.redirect,
        KID: response.bankMsg,
      },
    });
  } catch (err) {
    logError("donation/register:", err);
    return Response.json({}, { status: 500 });
  }
}

async function processPayment(donation: NewDonation): Promise<[Data, string]> {
  switch (donation.method) {
    case PaymentMethod.BankTransfer: {
      const [bankMsg, donorId] = await processBankTransferDonation(donation);
      return [{ message: "OK", bankMsg }, donorId];
    }

    case PaymentMethod.CreditCard:
    case PaymentMethod.MobilePay: {
      const [redirect, donorId] = await processQuickpayDonation(donation);
      return [{ message: "OK", redirect }, donorId];
    }
  }
}
