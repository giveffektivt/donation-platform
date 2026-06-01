import {
  BetalingsserviceError,
  DonationFrequency,
  logError,
  mapFromNorwegianOrgId,
  mapFromNorwegianPaymentMethods,
  type NewDonation,
  PaymentMethod,
  createOpenBankingPaymentForCharge,
  processQuickpayDonation,
  registerBankDonation,
  registerBetalingsserviceMandate,
  SubscribeToNewsletter,
} from "src";
import { z } from "zod";

type Data = {
  message: string;
  redirect: string;
};

const PayloadSchema = z
  .object({
    distributionCauseAreas: z
      .array(
        z.object({
          organizations: z.array(
            z
              .object({
                id: z.number().transform(mapFromNorwegianOrgId),
                percentageShare: z.coerce.number(),
              })
              .transform(({ id, percentageShare }) => ({
                recipient: id,
                percentage: percentageShare,
              })),
          ),
        }),
      )
      .transform((areas) =>
        areas.flatMap((a) => a.organizations).filter((o) => o.percentage > 0),
      ),
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
    regnr: z.preprocess(
      (val) => (!val ? undefined : val),
      z
        .string()
        .regex(/^\d{4}$/)
        .optional(),
    ),
    kontonr: z.preprocess(
      (val) => (!val ? undefined : val),
      z
        .string()
        .regex(/^\d{4,10}$/)
        .optional(),
    ),
  })
  .refine((data) => !data.donor.taxDeduction || !!data.donor.ssn, {
    path: ["ssn"],
    error: "ssn is required for tax deductions",
  })
  .refine(
    (data) =>
      !(data.recurring && data.method === PaymentMethod.BankTransfer) ||
      (!!data.donor.ssn && !!data.regnr && !!data.kontonr),
    {
      path: ["regnr"],
      error: "ssn, regnr and kontonr are required for recurring bank donations",
    },
  )
  .refine(
    (data) =>
      data.distributionCauseAreas.reduce((s, o) => s + o.percentage, 0) === 100,
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
    bankAccount:
      data.regnr && data.kontonr
        ? { regNo: data.regnr, accountNo: data.kontonr }
        : undefined,
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
      },
    });
  } catch (err) {
    logError("donation/register:", err);
    if (err instanceof BetalingsserviceError) {
      return Response.json(
        { message: err.message, code: err.code },
        {
          status:
            err.httpStatus >= 400 && err.httpStatus < 500
              ? err.httpStatus
              : 502,
        },
      );
    }
    return Response.json({}, { status: 500 });
  }
}

async function processPayment(donation: NewDonation): Promise<[Data, string]> {
  switch (donation.method) {
    case PaymentMethod.BankTransfer: {
      const { donation: registered, charge } =
        await registerBankDonation(donation);

      if (donation.frequency === DonationFrequency.Monthly) {
        if (!donation.tin || !donation.bankAccount) {
          throw new Error(
            "donation/register: unexpected error, zod didn't catch that monthly bank transfer requires tin and bankAccount",
          );
        }
        await registerBetalingsserviceMandate(registered, {
          tin: donation.tin,
          regNo: donation.bankAccount.regNo,
          accountNo: donation.bankAccount.accountNo,
        });
      }

      const { authorizationUrl } = await createOpenBankingPaymentForCharge(
        registered,
        charge,
        process.env.SUCCESS_URL,
      );

      return [
        { message: "OK", redirect: authorizationUrl },
        registered.donor_id,
      ];
    }

    case PaymentMethod.CreditCard:
    case PaymentMethod.MobilePay: {
      const [redirect, donorId] = await processQuickpayDonation(donation);
      return [{ message: "OK", redirect }, donorId];
    }
  }
}
