import type { PoolClient } from "pg";
import {
  type Charge,
  ChargeStatus,
  type Donation,
  DonationFrequency,
  type DonationWithGatewayInfoQuickpay,
  dbExecuteInTransaction,
  insertCharge,
  type NewDonation,
  type NewMembership,
  PaymentMethod,
  quickpayCreatePayment,
  quickpayCreateSubscription,
  quickpayOneTimeUrl,
  quickpaySubscriptionUrl,
  recreateFailedRecurringDonation,
  registerDonationViaQuickpay,
  registerMembershipViaQuickpay,
  setDonationQuickpayId,
  setChargeQuickpayMetadata,
} from "src";

export async function processQuickpayDonation(
  payload: NewDonation,
): Promise<[string, string]> {
  const [donation, charge] = await dbExecuteInTransaction(
    async (db) =>
      await addQuickpayId(
        db,
        ...(await insertQuickpayDataDonation(db, payload)),
      ),
  );
  return [
    await generateRedirectUrl(donation, charge, false),
    donation.donor_id,
  ];
}

export async function processQuickpayMembership(
  payload: NewMembership,
): Promise<[string, string]> {
  const [donation, charge] = await dbExecuteInTransaction(
    async (db) =>
      await addQuickpayId(
        db,
        ...(await insertQuickpayDataMembership(db, payload)),
      ),
  );
  return [await generateRedirectUrl(donation, charge, true), donation.donor_id];
}

export async function recreateQuickpayFailedRecurringDonation(
  db: PoolClient,
  donation_id: string,
): Promise<string> {
  const donation = await addQuickpayIdForRecurringDonation(
    db,
    await recreateQuickpayRecurringDonation(db, donation_id),
  );
  return await generateRenewUrl(donation);
}

export async function generateRenewPaymentUrl(
  donation: DonationWithGatewayInfoQuickpay,
): Promise<string> {
  return await quickpaySubscriptionUrl(
    donation,
    process.env.SUCCESS_URL_NEW_PAYMENT_INFO,
  );
}

export async function insertQuickpayDataDonation(
  db: PoolClient,
  payload: NewDonation,
): Promise<[DonationWithGatewayInfoQuickpay, Charge | null]> {
  const donation = await registerDonationViaQuickpay(db, payload);

  // Only create charges at this moment for auto-captured one-time donations
  const charge =
    donation.frequency === DonationFrequency.Once
      ? await insertCharge(db, {
          donation_id: donation.id,
          status: ChargeStatus.Waiting,
        })
      : null;

  return [donation, charge];
}

export async function insertQuickpayDataMembership(
  db: PoolClient,
  payload: NewMembership,
): Promise<[DonationWithGatewayInfoQuickpay, Charge | null]> {
  return [
    await registerMembershipViaQuickpay(db, {
      name: payload.name,
      email: payload.email,
      address: payload.address,
      postcode: payload.postcode,
      city: payload.city,
      country: payload.country,
      tin: payload.tin,
      birthday: payload.birthday,
    }),
    null,
  ];
}

export async function recreateQuickpayRecurringDonation(
  db: PoolClient,
  donation_id: string,
): Promise<DonationWithGatewayInfoQuickpay> {
  return await recreateFailedRecurringDonation(db, donation_id);
}

async function addQuickpayId(
  db: PoolClient,
  donation: DonationWithGatewayInfoQuickpay,
  charge: Charge | null,
): Promise<[DonationWithGatewayInfoQuickpay, Charge | null]> {
  donation.gateway_metadata.quickpay_id = await (donation && charge
    ? quickpayCreatePayment(charge.short_id, donation)
    : quickpayCreateSubscription(donation));

  await setDonationQuickpayId(db, donation);
  if (charge) {
    await setChargeQuickpayMetadata(
      db,
      charge.short_id,
      donation.gateway_metadata.quickpay_id,
    );
  }

  return [donation, charge];
}

async function addQuickpayIdForRecurringDonation(
  db: PoolClient,
  donation: DonationWithGatewayInfoQuickpay,
): Promise<DonationWithGatewayInfoQuickpay> {
  donation.gateway_metadata.quickpay_id =
    await quickpayCreateSubscription(donation);

  await setDonationQuickpayId(db, donation);

  return donation;
}

async function generateRedirectUrl(
  donation: DonationWithGatewayInfoQuickpay,
  charge: Charge | null,
  isMembership: boolean,
): Promise<string> {
  const successUrl = donation.fundraiser_id
    ? `${process.env.HOMEPAGE_URL}/api/fundraiser/redirect?fundraiserId=${donation.fundraiser_id}&secret=${process.env.REVALIDATE_TOKEN}`
    : isMembership
      ? process.env.SUCCESS_URL_MEMBERSHIP_ONLY
      : withPlausibleParam(process.env.SUCCESS_URL, donation);

  const url = await (charge
    ? quickpayOneTimeUrl(donation, successUrl)
    : quickpaySubscriptionUrl(donation, successUrl));

  return url;
}

/**
 * Adds the `plausible` query parameter that the thank-you page decodes to send the revenue
 * event to Plausible: base64 of a JSON object with the amount, the method, whether the
 * donation is recurring and the donation id as "kid".
 */
export function withPlausibleParam(
  successUrl: string,
  donation: Pick<Donation, "id" | "amount" | "frequency" | "method">,
): string {
  const data = {
    revenue: String(donation.amount),
    method: donation.method === PaymentMethod.MobilePay ? "mobilepay" : "card",
    recurring:
      donation.frequency === DonationFrequency.Monthly ||
      donation.frequency === DonationFrequency.Yearly,
    kid: donation.id,
  };

  // URL keeps any query parameters SUCCESS_URL already has and encodes the value.
  const url = new URL(successUrl);
  url.searchParams.set(
    "plausible",
    Buffer.from(JSON.stringify(data)).toString("base64"),
  );
  return url.toString();
}

async function generateRenewUrl(
  donation: DonationWithGatewayInfoQuickpay,
): Promise<string> {
  return `${process.env.RENEW_PAYMENT_INFO_URL}?id=${donation.id}&utm_source=backend&utm_campaign=fornyelse`;
}
