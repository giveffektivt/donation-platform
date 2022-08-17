import { PoolClient } from "pg";
import {
  BankTransferInfo,
  dbClient,
  dbExecuteInTransaction,
  DonationToEmail,
  DonationWithGatewayInfoBankTransfer,
  DonorWithSensitiveInfo,
  insertDonationMembershipViaBankTransfer,
  insertDonationViaBankTransfer,
  insertDonorWithSensitiveInfo,
  parseDonationFrequency,
  parseDonationRecipient,
  sendMembershipEmail,
  sendPaymentEmail,
  setDonationEmailed,
  SubmitData,
} from "src";
import { EmailedStatus } from "src/donation";

export async function processBankTransferPayment(
  submitData: SubmitData
): Promise<string> {
  const [donor, donation, membership] = await dbExecuteInTransaction(
    async (db) => await insertBankTransferData(db, submitData)
  );
  await sendEmails(donor, donation, membership);
  return donation.gateway_metadata.bank_msg;
}

export async function insertBankTransferData(
  db: PoolClient,
  submitData: SubmitData
): Promise<
  [
    DonorWithSensitiveInfo,
    DonationWithGatewayInfoBankTransfer,
    DonationWithGatewayInfoBankTransfer | null
  ]
> {
  if (submitData.membershipOnly) {
    throw new Error(
      "Bank transfer is not supported for membership-only payments"
    );
  }

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

  const donation = await insertDonationViaBankTransfer(db, {
    donor_id: donor.id,
    amount: submitData.amount,
    recipient: parseDonationRecipient(submitData.recipient),
    frequency: parseDonationFrequency(submitData.subscription),
    tax_deductible: submitData.taxDeduction,
  });

  const membership = submitData.membership
    ? await insertDonationMembershipViaBankTransfer(db, {
        donor_id: donor.id,
        gateway_metadata: donation.gateway_metadata,
      })
    : null;

  return [donor, donation, membership];
}

async function sendEmails(
  donor: DonorWithSensitiveInfo,
  donation: DonationWithGatewayInfoBankTransfer,
  membership: DonationWithGatewayInfoBankTransfer | null
) {
  const donations = membership ? [donation.id, membership.id] : [donation.id];
  console.log(
    `Sending ${donations.length} bank transfer donation email(s):`,
    donations
  );

  const bankTransferInfo: BankTransferInfo = {
    amount: donation.amount + (membership ? membership.amount : 0),
    msg: donation.gateway_metadata.bank_msg,
  };

  // Donation email
  const donationToEmail: DonationToEmail = {
    id: donation.id,
    email: donor.email,
    amount: donation.amount,
    recipient: donation.recipient,
    frequency: donation.frequency,
    tax_deductible: donation.tax_deductible,
    country: donor.country,
  };

  const db = await dbClient();
  try {
    try {
      await setDonationEmailed(db, donationToEmail, EmailedStatus.Attempted);
      await sendPaymentEmail(donationToEmail, bankTransferInfo);
      await setDonationEmailed(db, donationToEmail, EmailedStatus.Yes);
    } catch (err) {
      console.error(
        `Error sending payment email for ID "${donation.id}":`,
        err
      );
    }

    if (!membership) {
      return;
    }

    // Membership email
    const membershipToEmail: DonationToEmail = {
      id: membership.id,
      email: donor.email,
      amount: membership.amount,
      recipient: membership.recipient,
      frequency: membership.frequency,
      tax_deductible: membership.tax_deductible,
      country: donor.country,
    };

    try {
      await setDonationEmailed(db, membershipToEmail, EmailedStatus.Attempted);
      await sendMembershipEmail(membershipToEmail, bankTransferInfo);
      await setDonationEmailed(db, membershipToEmail, EmailedStatus.Yes);
    } catch (err) {
      console.error(
        `Error sending membership email for ID "${donation.id}":`,
        err
      );
    }
  } finally {
    db.release();
  }
}
