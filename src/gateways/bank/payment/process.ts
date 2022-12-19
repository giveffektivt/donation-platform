import { PoolClient } from "pg";
import {
  BankTransferInfo,
  dbClient,
  dbExecuteInTransaction,
  DonationToEmail,
  DonationWithGatewayInfoBankTransfer,
  DonorWithSensitiveInfo,
  EmailedStatus,
  insertDonationViaBankTransfer,
  insertDonorWithSensitiveInfo,
  parseDonationFrequency,
  parseDonationRecipient,
  sendPaymentEmail,
  setDonationEmailed,
  SubmitDataDonation,
} from "src";

export async function processBankTransferDonation(
  submitData: SubmitDataDonation
): Promise<[string, string]> {
  const [donor, donation] = await dbExecuteInTransaction(
    async (db) => await insertBankTransferData(db, submitData)
  );
  await sendEmails(donor, donation);
  return [donation.gateway_metadata.bank_msg, donor.id];
}

export async function insertBankTransferData(
  db: PoolClient,
  submitData: SubmitDataDonation
): Promise<[DonorWithSensitiveInfo, DonationWithGatewayInfoBankTransfer]> {
  const donor = await insertDonorWithSensitiveInfo(db, {
    email: submitData.email,

    tin: submitData.tin,
  });

  const donation = await insertDonationViaBankTransfer(db, {
    donor_id: donor.id,
    amount: submitData.amount,
    recipient: parseDonationRecipient(submitData.recipient),
    frequency: parseDonationFrequency(submitData.subscription),
    tax_deductible: submitData.taxDeduction,
  });

  return [donor, donation];
}

async function sendEmails(
  donor: DonorWithSensitiveInfo,
  donation: DonationWithGatewayInfoBankTransfer
) {
  console.log(`Sending bank transfer donation email: ${donation.id}`);

  const bankTransferInfo: BankTransferInfo = {
    amount: donation.amount,
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
  } finally {
    db.release();
  }
}
