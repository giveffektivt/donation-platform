import type { PoolClient } from "pg";
import {
  type Charge,
  ChargeStatus,
  dbExecuteInTransaction,
  DonationFrequency,
  DonationRecipient,
  type DonationWithGatewayInfoQuickpay,
  type Donor,
  type DonorWithSensitiveInfo,
  insertCharge,
  insertMembershipViaQuickpay,
  insertDonationViaQuickpay,
  insertDonorWithSensitiveInfo,
  parseDonationFrequency,
  parseDonationRecipient,
  parsePaymentMethod,
  PaymentMethod,
  quickpayCreatePayment,
  quickpayCreateSubscription,
  quickpayOneTimeUrl,
  quickpaySubscriptionUrl,
  setDonationQuickpayId,
  type SubmitDataDonation,
  type SubmitDataMembership,
  type FailedRecurringDonation,
  setDonationCancelledById,
  setDonationEmailed,
  EmailedStatus,
} from "src";

export async function processQuickpayDonation(
  submitData: SubmitDataDonation,
): Promise<[string, string]> {
  const [donor, donation, charge] = await dbExecuteInTransaction(
    async (db) =>
      await addQuickpayId(
        db,
        ...(await insertQuickpayDataDonation(db, submitData)),
      ),
  );
  return [await generateRedirectUrl(donation, charge), donor.id];
}

export async function processQuickpayMembership(
  submitData: SubmitDataMembership,
): Promise<[string, string]> {
  const [donor, donation, charge] = await dbExecuteInTransaction(
    async (db) =>
      await addQuickpayId(
        db,
        ...(await insertQuickpayDataMembership(db, submitData)),
      ),
  );
  return [await generateRedirectUrl(donation, charge), donor.id];
}

export async function recreateQuickpayFailedRecurringDonation(
  db: PoolClient,
  info: FailedRecurringDonation,
): Promise<string> {
  const donation = await addQuickpayIdForRecurringDonation(
    db,
    await recreateQuickpayRecurringDonation(db, info),
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
): Promise<
  [DonorWithSensitiveInfo, DonationWithGatewayInfoQuickpay, Charge | null]
> {
  const donor = await insertDonorWithSensitiveInfo(db, {
    email: submitData.email,
    tin: submitData.tin,
  });

  const donation = await insertDonationViaQuickpay(db, {
    donor_id: donor.id,
    amount: submitData.amount,
    recipient: parseDonationRecipient(submitData.recipient),
    frequency: parseDonationFrequency(submitData.frequency),
    method: parsePaymentMethod(submitData.method),
    tax_deductible: submitData.taxDeductible,
    fundraiser_id: submitData.fundraiserId,
    message: submitData.message,
  });

  // Only create charges at this moment for auto-captured one-time donations
  const charge =
    donation.frequency === DonationFrequency.Once
      ? await insertCharge(db, {
          donation_id: donation.id,
          status: ChargeStatus.Waiting,
        })
      : null;

  return [donor, donation, charge];
}

export async function insertQuickpayDataMembership(
  db: PoolClient,
  submitData: SubmitDataMembership,
): Promise<
  [DonorWithSensitiveInfo, DonationWithGatewayInfoQuickpay, Charge | null]
> {
  const donor = await insertDonorWithSensitiveInfo(db, {
    name: submitData.name,
    email: submitData.email,
    address: submitData.address,
    postcode: submitData.postcode,
    city: submitData.city,
    country: submitData.country,
    tin: submitData.tin,
    birthday: submitData.birthday,
  });

  const donation = await insertMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  return [donor, donation, null];
}

export async function recreateQuickpayRecurringDonation(
  db: PoolClient,
  info: FailedRecurringDonation,
): Promise<DonationWithGatewayInfoQuickpay> {
  await setDonationCancelledById(db, info.donation_id);

  const donation =
    info.recipient === DonationRecipient.GivEffektivtsMedlemskab
      ? await insertMembershipViaQuickpay(db, {
          donor_id: info.donor_id,
          method: info.method,
        })
      : await insertDonationViaQuickpay(db, {
          donor_id: info.donor_id,
          amount: info.amount,
          recipient: info.recipient,
          frequency: info.frequency,
          method: info.method,
          tax_deductible: info.tax_deductible,
          fundraiser_id: info.fundraiser_id,
          message: info.message,
        });

  await setDonationEmailed(db, donation, EmailedStatus.Yes);

  return donation;
}

async function addQuickpayId(
  db: PoolClient,
  donor: Donor,
  donation: DonationWithGatewayInfoQuickpay,
  charge: Charge | null,
): Promise<[Donor, DonationWithGatewayInfoQuickpay, Charge | null]> {
  donation.gateway_metadata.quickpay_id = await (donation && charge
    ? quickpayCreatePayment(charge.short_id, donation)
    : quickpayCreateSubscription(donation));

  await setDonationQuickpayId(db, donation);

  return [donor, donation, charge];
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
): Promise<string> {
  const successUrl =
    donation.recipient !== DonationRecipient.GivEffektivtsMedlemskab
      ? process.env.SUCCESS_URL
      : process.env.SUCCESS_URL_MEMBERSHIP_ONLY;

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
