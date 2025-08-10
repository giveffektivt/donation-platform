import type { PoolClient } from "pg";
import {
  type Charge,
  ChargeStatus,
  DonationFrequency,
  DonationRecipient,
  type DonationWithGatewayInfoQuickpay,
  dbExecuteInTransaction,
  insertCharge,
  PaymentMethod,
  parseDonationFrequency,
  parseDonationRecipient,
  parsePaymentMethod,
  quickpayCreatePayment,
  quickpayCreateSubscription,
  quickpayOneTimeUrl,
  quickpaySubscriptionUrl,
  recreateFailedRecurringDonation,
  registerMembershipViaQuickpay,
  type SubmitDataDonation,
  type SubmitDataMembership,
  setDonationQuickpayId,
  registerDonationViaQuickpay,
} from "src";

export async function processQuickpayDonation(
  submitData: SubmitDataDonation,
): Promise<[string, string]> {
  const [donation, charge] = await dbExecuteInTransaction(
    async (db) =>
      await addQuickpayId(
        db,
        ...(await insertQuickpayDataDonation(db, submitData)),
      ),
  );
  return [
    await generateRedirectUrl(donation, charge, false),
    donation.donor_id,
  ];
}

export async function processQuickpayMembership(
  submitData: SubmitDataMembership,
): Promise<[string, string]> {
  const [donation, charge] = await dbExecuteInTransaction(
    async (db) =>
      await addQuickpayId(
        db,
        ...(await insertQuickpayDataMembership(db, submitData)),
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
  submitData: SubmitDataDonation,
): Promise<[DonationWithGatewayInfoQuickpay, Charge | null]> {
  const donation = await registerDonationViaQuickpay(db, {
    email: submitData.email,
    tin: submitData.tin,
    amount: submitData.amount,
    frequency: parseDonationFrequency(submitData.frequency),
    method: parsePaymentMethod(submitData.method),
    tax_deductible: submitData.taxDeductible,
    fundraiser_id: submitData.fundraiserId,
    message: submitData.message,
    earmarks: [
      {
        recipient: parseDonationRecipient(submitData.recipient),
        percentage: 100,
      },
    ],
  });

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
  submitData: SubmitDataMembership,
): Promise<[DonationWithGatewayInfoQuickpay, Charge | null]> {
  return [
    await registerMembershipViaQuickpay(db, {
      name: submitData.name,
      email: submitData.email,
      address: submitData.address,
      postcode: submitData.postcode,
      city: submitData.city,
      country: submitData.country,
      tin: submitData.tin,
      birthday: submitData.birthday,
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
  const successUrl = isMembership
    ? process.env.SUCCESS_URL_MEMBERSHIP_ONLY
    : process.env.SUCCESS_URL;

  const url = await (charge
    ? quickpayOneTimeUrl(donation, successUrl)
    : quickpaySubscriptionUrl(donation, successUrl));

  return url;
}

async function generateRenewUrl(
  donation: DonationWithGatewayInfoQuickpay,
): Promise<string> {
  return `${process.env.RENEW_PAYMENT_INFO_URL}?id=${donation.id}`;
}
