import { PoolClient } from "pg";
import {
  Charge,
  ChargeStatus,
  dbExecuteInTransaction,
  DonationFrequency,
  DonationRecipient,
  DonationWithGatewayInfoScanpay,
  DonorWithSensitiveInfo,
  insertCharge,
  insertDonationViaScanpay,
  insertDonorWithSensitiveInfo,
  parseDonationFrequency,
  parseDonationRecipient,
  parsePaymentMethod,
  PaymentMethod,
  scanpayOneTimeUrl,
  scanpaySubscriptionUrl,
  SubmitDataDonation,
} from "src";

export async function processScanpayDonation(
  submitData: SubmitDataDonation,
  customerIp: string
): Promise<[string, string]> {
  const [donor, donation, charge] = await dbExecuteInTransaction(
    async (db) => await insertScanpayData(db, submitData)
  );
  return [
    await generateRedirectUrl(donor, donation, charge, customerIp),
    donor.id,
  ];
}

export async function insertScanpayData(
  db: PoolClient,
  submitData: SubmitDataDonation
): Promise<
  [DonorWithSensitiveInfo, DonationWithGatewayInfoScanpay, Charge | null]
> {
  const donor = await insertDonorWithSensitiveInfo(db, {
    email: submitData.email,
    tin: submitData.tin,
  });

  const donation = await insertDonationViaScanpay(db, {
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

async function generateRedirectUrl(
  donor: DonorWithSensitiveInfo,
  donation: DonationWithGatewayInfoScanpay,
  charge: Charge | null,
  customerIp: string
) {
  const successUrl =
    donation.recipient !== DonationRecipient.GivEffektivt
      ? process.env.SUCCESS_URL
      : process.env.SUCCESS_URL_MEMBERSHIP_ONLY;

  const url = await (charge
    ? scanpayOneTimeUrl(donor, donation, charge, customerIp, successUrl)
    : scanpaySubscriptionUrl(donor, donation, customerIp, successUrl));

  const slug =
    donation.method === PaymentMethod.MobilePay ? "?go=mobilepay" : "";

  return url + slug;
}
