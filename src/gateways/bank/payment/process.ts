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
  SubmitData,
} from "src";

export async function processBankTransferPayment(
  submitData: SubmitData
): Promise<string> {
  const [donor, donation] = await dbExecuteInTransaction(
    async (db) => await insertBankTransferData(db, submitData)
  );
  await sendEmails(donor, donation);
  return donation.gateway_metadata.bank_msg;
}

export async function insertBankTransferData(
  db: PoolClient,
  submitData: SubmitData
): Promise<[DonorWithSensitiveInfo, DonationWithGatewayInfoBankTransfer]> {
  if (submitData.membership) {
    throw new Error("Bank transfer is not supported for membership payments");
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
