import {
  adjustChargeDay,
  changeDonation,
  dbClient,
  dbRelease,
  DonationRecipient,
  getDonorsDetailedByEmail,
  getRecurringDonationByIdAndEmail,
  getRecurringDonationsByEmail,
  logError,
  mapFromNorwegianOrgId,
  verifyJwtBearerToken,
} from "src";
import type { NextRequest } from "next/server";
import { z } from "zod";

const stripNulls = (val: unknown): unknown => {
  if (Array.isArray(val)) return val.map(stripNulls);
  if (val !== null && typeof val === "object")
    return Object.entries(val).reduce(
      (acc, [k, v]) => ({
        ...acc,
        [k]: v === null ? undefined : stripNulls(v),
      }),
      {},
    );
  return val;
};

const EarmarkSchema = z
  .object({
    id: z.number().int().min(1),
    amount: z.coerce.number().positive(),
  })
  .transform((org) => ({
    recipient: mapFromNorwegianOrgId(org.id),
    amount: org.amount,
  }));

const CauseAreaSchema = z
  .object({
    id: z
      .number()
      .int()
      .refine((id) => [1, 2, 4, 5, 99].includes(id))
      .optional()
      .default(99),
    amount: z.coerce.number().positive(),
    standardSplit: z.boolean().optional(),
    organizations: z.array(EarmarkSchema).optional(),
  })
  .refine(
    (ca) =>
      ca.standardSplit ||
      ca.organizations?.reduce((sum, org) => sum + org.amount, 0) === ca.amount,
    {
      path: ["organizations"],
      message: "Organizations must sum to cause area amount",
    },
  )
  .transform((ca) => {
    const overarchingSmartDistribution = ca.organizations?.find(
      (org) => org.recipient === DonationRecipient.SmartFordeling,
    );
    const organizations = ca.standardSplit
      ? [
          overarchingSmartDistribution ?? {
            recipient:
              ca.id === 99
                ? DonationRecipient.SmartFordeling
                : ca.id === 1
                  ? DonationRecipient.SmartFordelingGlobalSundhed
                  : ca.id === 2
                    ? DonationRecipient.SmartFordelingDyrevelfærd
                    : ca.id === 4
                      ? DonationRecipient.GivEffektivtsArbejdeOgVækst
                      : DonationRecipient.Andet,
            amount: ca.amount,
          },
        ]
      : (ca.organizations ?? []);

    return organizations.map((org) => ({
      recipient: org.recipient,
      amount: ca.standardSplit ? ca.amount : org.amount,
    }));
  });

const UpdateRecurringSchema = z.object({
  distribution: z
    .object({
      taxUnitId: z.number().int().min(1).optional(),
      causeAreas: z.array(CauseAreaSchema).optional(),
    })
    .optional(),
  chargeDay: z
    .number()
    .int()
    .min(0)
    .max(28)
    .transform((v) => (v === 0 ? 28 : v))
    .optional(),
  amount: z.number().positive().optional(),
});

export async function GET(req: Request) {
  const user = await verifyJwtBearerToken(req.headers.get("authorization"));
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let db = null;

  try {
    db = await dbClient();

    const donations = await getRecurringDonationsByEmail(
      db,
      user[process.env.AUTH0_EMAIL_CLAIM] as string,
    );

    return Response.json({
      status: 200,
      content: donations.map((d) => ({
        id: d.id,
        kid: d.id,
        bank_msg: d.gateway_metadata?.bank_msg,
        cancelled: d.cancelled,
        createdAt: d.created_at.toISOString(),
        chargeDay: d.monthly_charge_day,
        amount: d.amount,
        method: d.method,
        is_payment_expired: d.is_payment_expired,
      })),
    });
  } catch (e) {
    logError("donors/[id]/recurring: ", e);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}

export async function PUT(req: NextRequest) {
  const user = await verifyJwtBearerToken(req.headers.get("authorization"));
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const donationId = req.nextUrl.searchParams.get("id");
  if (!donationId) {
    return Response.json({ message: "Missing donation id" }, { status: 400 });
  }

  const parsed = UpdateRecurringSchema.safeParse(stripNulls(await req.json()));
  if (!parsed.success) {
    return Response.json(
      {
        message: "Validation failed",
        errors: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  const email = user[process.env.AUTH0_EMAIL_CLAIM] as string;
  const payload = parsed.data;

  let db = null;

  try {
    db = await dbClient();

    const donation = await getRecurringDonationByIdAndEmail(
      db,
      donationId,
      email,
    );

    if (!donation) {
      return Response.json({ message: "Not found" }, { status: 404 });
    }

    const currentEarmarks: { recipient: string; amount: number }[] =
      donation.earmarks ?? [];

    if (
      currentEarmarks.some(
        (e) => e.recipient === DonationRecipient.GivEffektivtsMedlemskab,
      )
    ) {
      return Response.json(
        { message: "Cannot change a membership donation" },
        { status: 400 },
      );
    }

    const newEarmarks = payload.distribution?.causeAreas?.flat() ?? null;

    if (
      newEarmarks !== null &&
      newEarmarks.reduce((sum, earmark) => sum + earmark.amount, 0) !==
        (payload.amount ?? donation.amount)
    ) {
      return Response.json(
        { message: "Cause areas must sum to donation amount" },
        { status: 400 },
      );
    }

    if (
      newEarmarks !== null &&
      newEarmarks.some(
        (e) => e.recipient === DonationRecipient.GivEffektivtsMedlemskab,
      )
    ) {
      return Response.json(
        { message: "Cannot change to a membership donation" },
        { status: 400 },
      );
    }

    let newTin: string | null = null;

    if (payload.distribution?.taxUnitId !== undefined) {
      const donors = await getDonorsDetailedByEmail(db, email);
      const taxUnitIndex = payload.distribution.taxUnitId - 1;
      if (taxUnitIndex < 0 || taxUnitIndex >= donors.length) {
        return Response.json({ message: "Invalid taxUnitId" }, { status: 400 });
      }
      const resolvedTin = donors[taxUnitIndex].tin ?? null;
      newTin = resolvedTin !== (donation.tin ?? null) ? resolvedTin : null;
    }

    const newAmount =
      payload.amount !== undefined && payload.amount !== donation.amount
        ? payload.amount
        : null;

    const earmarksChanged =
      newEarmarks !== null &&
      JSON.stringify(
        newEarmarks
          .map((e) => ({ recipient: e.recipient, amount: e.amount }))
          .sort((a, b) => a.recipient.localeCompare(b.recipient)),
      ) !==
        JSON.stringify(
          currentEarmarks
            .map((e) => ({
              recipient: e.recipient,
              amount: e.amount,
            }))
            .sort((a, b) => a.recipient.localeCompare(b.recipient)),
        );

    const somethingToChange =
      newAmount !== null || earmarksChanged || newTin !== null;

    let activeDonationId = donationId;

    if (somethingToChange) {
      const changed = await changeDonation(
        db,
        donationId,
        newAmount,
        earmarksChanged ? newEarmarks : null,
        newTin,
      );
      activeDonationId = changed.id;
    }

    if (payload.chargeDay !== undefined) {
      await adjustChargeDay(db, activeDonationId, payload.chargeDay);
    }

    return Response.json({ status: 200, content: true });
  } catch (e) {
    logError("PUT donors/[id]/recurring: ", e);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
