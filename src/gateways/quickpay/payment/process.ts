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
  quickpayCreatePayment,
  quickpayCreateSubscription,
  quickpayOneTimeUrl,
  quickpaySubscriptionUrl,
  setDonationQuickpayId,
  SubmitData,
} from "src";

export async function processQuickpayPayment(
  submitData: SubmitData
): Promise<[string, string]> {
  const [donor, donation, charge] = await dbExecuteInTransaction(
    async (db) => await insertQuickpayDataWithQuickpayId(db, submitData)
  );
  return [await generateRedirectUrl(donation, charge), donor.id];
}

export async function insertQuickpayData(
  db: PoolClient,
  submitData: SubmitData
): Promise<
  [DonorWithSensitiveInfo, DonationWithGatewayInfoQuickpay, Charge | null]
> {
  const donor = await insertDonorWithSensitiveInfo(db, {
    name: submitData.name,
    email: submitData.email,
    address: submitData.address,
    postcode: submitData.zip,
    city: submitData.city,
    country: submitData.country,
    tin: submitData.tin,
    birthday: submitData.birthday,
  });

  const donation = submitData.membership
    ? await insertDonationMembershipViaQuickpay(db, {
        donor_id: donor.id,
        method: parsePaymentMethod(submitData.method),
      })
    : await insertDonationViaQuickpay(db, {
        donor_id: donor.id,
        amount: submitData.amount,
        recipient: parseDonationRecipient(submitData.recipient),
        frequency: parseDonationFrequency(submitData.subscription),
        method: parsePaymentMethod(submitData.method),
        tax_deductible: submitData.taxDeduction,
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

async function insertQuickpayDataWithQuickpayId(
  db: PoolClient,
  submitData: SubmitData
): Promise<[Donor, DonationWithGatewayInfoQuickpay, Charge | null]> {
  const [donor, donation, charge] = await insertQuickpayData(db, submitData);

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
