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
            percentageShare: z.coerce
              .number()
              .min(0)
              .max(100)
              .optional()
              .default(100),
            organizations: z.array(
              z
                .object({
                  id: z.number().transform(mapFromNorwegianOrgId),
                  percentageShare: z.coerce.number().min(0).max(100),
                })
                .transform(({ id, percentageShare }) => ({
                  recipient: id,
                  percentage: percentageShare,
                })),
            ),
          })
          .transform((area) =>
            area.organizations.map((organization) => ({
              recipient: organization.recipient,
              percentage:
                (organization.percentage * area.percentageShare) / 100,
            })),
          ),
      )
      .transform((areas) => areas.flat().filter((o) => o.percentage > 0)),
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
    amount: z.coerce.number().min(1).transform(Math.round),
  })
  .refine((data) => !data.donor.taxDeduction || !!data.donor.ssn, {
    path: ["ssn"],
    error: "ssn is required for tax deductions",
  })
  .refine(
    (data) =>
      Math.abs(
        data.distributionCauseAreas.reduce((s, o) => s + o.percentage, 0) - 100,
      ) < 0.000001,
    {
      path: ["distributionCauseAreas"],
      error: "cause areas must sum to 100",
    },
  )
  .transform((data) => ({
    amount: data.amount,
    frequency: data.recurring
      ? DonationFrequency.Monthly
      : DonationFrequency.Once,
    taxDeductible: data.donor.taxDeduction,
    tin: data.donor.ssn,
    email: data.donor.email,
    method: data.method,
    earmarks: data.distributionCauseAreas,
    subscribeToNewsletter: data.donor.newsletter,
    fundraiserId: data.fundraiser?.id,
    publicMessageAuthor: data.fundraiser?.showName,
    messageAuthor: data.fundraiser?.messageSenderName,
    message: data.fundraiser?.message,
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
