import { PoolClient } from "pg";
import {
  Charge,
  ChargeStatus,
  dbExecuteInTransaction,
  DonationFrequency,
  DonationRecipient,
  DonationWithGatewayInfoQuickpay,
  Donor,
  DonorWithSensitiveInfo,
  insertCharge,
  insertDonationMembershipViaQuickpay,
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
  SubmitDataDonation,
  SubmitDataMembership,
} from "src";

export async function processQuickpayDonation(
  submitData: SubmitDataDonation
): Promise<[string, string]> {
  const [donor, donation, charge] = await dbExecuteInTransaction(
    async (db) =>
      await addQuickpayId(
        db,
        ...(await insertQuickpayDataDonation(db, submitData))
      )
  );
  return [await generateRedirectUrl(donation, charge), donor.id];
}

export async function processQuickpayMembership(
  submitData: SubmitDataMembership
): Promise<[string, string]> {
  const [donor, donation, charge] = await dbExecuteInTransaction(
    async (db) =>
      await addQuickpayId(
        db,
        ...(await insertQuickpayDataMembership(db, submitData))
      )
  );
  return [await generateRedirectUrl(donation, charge), donor.id];
}

export async function insertQuickpayDataDonation(
  db: PoolClient,
  submitData: SubmitDataDonation
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
  submitData: SubmitDataMembership
): Promise<
  [DonorWithSensitiveInfo, DonationWithGatewayInfoQuickpay, Charge | null]
> {
  const donor = await insertDonorWithSensitiveInfo(db, {
    name: submitData.name,
    email: submitData.email,
    address: submitData.address,
    postcode: submitData.postcode,
    city: submitData.city,
    country: "Denmark",
    tin: submitData.tin,
  });

  const donation = await insertDonationMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  return [donor, donation, null];
}

async function addQuickpayId(
  db: PoolClient,
  donor: Donor,
  donation: DonationWithGatewayInfoQuickpay,
  charge: Charge | null
): Promise<[Donor, DonationWithGatewayInfoQuickpay, Charge | null]> {
  donation.gateway_metadata.quickpay_id = await (donation && charge
    ? quickpayCreatePayment(charge.short_id, donation)
    : quickpayCreateSubscription(donation));

  await setDonationQuickpayId(db, donation);

  return [donor, donation, charge];
}

async function generateRedirectUrl(
  donation: DonationWithGatewayInfoQuickpay,
  charge: Charge | null
) {
  const successUrl =
    donation.recipient !== DonationRecipient.GivEffektivt
      ? process.env.SUCCESS_URL
      : process.env.SUCCESS_URL_MEMBERSHIP_ONLY;

  const url = await (charge
    ? quickpayOneTimeUrl(donation, successUrl)
    : quickpaySubscriptionUrl(donation, successUrl));

  return url;
}
