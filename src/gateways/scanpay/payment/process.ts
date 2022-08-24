import { PoolClient } from "pg";
import {
  Charge,
  ChargeStatus,
  dbExecuteInTransaction,
  DonationFrequency,
  DonationWithGatewayInfoScanPay,
  DonorWithSensitiveInfo,
  insertCharge,
  insertDonationMembershipViaScanPay,
  insertDonationViaScanPay,
  insertDonorWithSensitiveInfo,
  parseDonationFrequency,
  parseDonationRecipient,
  parsePaymentMethod,
  PaymentMethod,
  scanPayOneTimeUrl,
  scanPaySubscriptionUrl,
  SubmitData,
} from "src";

export async function processScanPayPayment(
  submitData: SubmitData,
  customerIp: string
): Promise<string> {
  const [donor, donation, donationCharge, membership] =
    await dbExecuteInTransaction(
      async (db) => await insertScanPayData(db, submitData)
    );
  return await generateRedirectUrl(
    donor,
    donation,
    donationCharge,
    membership,
    customerIp
  );
}

export async function insertScanPayData(
  db: PoolClient,
  submitData: SubmitData
): Promise<
  [
    DonorWithSensitiveInfo,
    DonationWithGatewayInfoScanPay | null,
    Charge | null,
    DonationWithGatewayInfoScanPay | null
  ]
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

  const donation = submitData.membershipOnly
    ? null
    : await insertDonationViaScanPay(db, {
        donor_id: donor.id,
        amount: submitData.amount,
        recipient: parseDonationRecipient(submitData.recipient),
        frequency: parseDonationFrequency(submitData.subscription),
        method: parsePaymentMethod(submitData.method),
        tax_deductible: submitData.taxDeduction,
      });

  // Only create charges at this moment for auto-captured one-time donations
  const donationCharge =
    donation && isAutoCapturedPayment(submitData)
      ? await insertCharge(db, {
          donation_id: donation.id,
          status: ChargeStatus.Waiting,
        })
      : null;

  const membership = submitData.membership
    ? await insertDonationMembershipViaScanPay(db, {
        donor_id: donor.id,
        method: parsePaymentMethod(submitData.method),
      })
    : null;

  // Membership charge for sure will not be auto-captured

  return [donor, donation, donationCharge, membership];
}

async function generateRedirectUrl(
  donor: DonorWithSensitiveInfo,
  donation: DonationWithGatewayInfoScanPay | null,
  donationCharge: Charge | null,
  membership: DonationWithGatewayInfoScanPay | null,
  customerIp: string
) {
  const donations = [donation, membership].filter(
    (el): el is DonationWithGatewayInfoScanPay => el !== null
  );

  const successUrl = !!donation
    ? process.env.SUCCESS_URL
    : process.env.SUCCESS_URL_MEMBERSHIP_ONLY;

  const url = await (donation && donationCharge
    ? scanPayOneTimeUrl(donor, donation, donationCharge, customerIp, successUrl)
    : scanPaySubscriptionUrl(donor, donations, customerIp, successUrl));

  const slug =
    donations[0].method === PaymentMethod.MobilePay ? "?go=mobilepay" : "";

  return url + slug;
}

const isAutoCapturedPayment = (submitData: SubmitData) =>
  parseDonationFrequency(submitData.subscription) === DonationFrequency.Once &&
  !submitData.membership;
