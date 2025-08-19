import type { PoolClient } from "pg";
import {
  type BankTransferInfo,
  type DonationRecipient,
  type DonationToEmail,
  type DonationWithGatewayInfoBankTransfer,
  dbClient,
  dbExecuteInTransaction,
  dbRelease,
  EmailedStatus,
  logError,
  parseDonationFrequency,
  parseDonationRecipient,
  registerDonationViaBankTransfer,
  type SubmitDataDonation,
  sendPaymentEmail,
  setDonationEmailed,
} from "src";

export async function processBankTransferDonation(
  submitData: SubmitDataDonation,
): Promise<[string, string]> {
  const donation = await dbExecuteInTransaction(
    async (db) => await insertBankTransferData(db, submitData),
  );
  await sendEmails(
    submitData.email,
    parseDonationRecipient(submitData.recipient),
    donation,
  );
  return [donation.gateway_metadata.bank_msg, donation.donor_id];
}

export async function insertBankTransferData(
  db: PoolClient,
  submitData: SubmitDataDonation,
): Promise<DonationWithGatewayInfoBankTransfer> {
  return await registerDonationViaBankTransfer(db, {
    email: submitData.email,
    tin: submitData.tin,
    amount: submitData.amount,
    frequency: parseDonationFrequency(submitData.frequency),
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
}

async function sendEmails(
  email: string,
  recipient: DonationRecipient,
  donation: DonationWithGatewayInfoBankTransfer,
) {
  console.log(`Sending bank transfer donation email: ${donation.id}`);

  const bankTransferInfo: BankTransferInfo = {
    amount: donation.amount,
    msg: donation.gateway_metadata.bank_msg,
  };

  // Donation email
  const donationToEmail: DonationToEmail = {
    id: donation.id,
    email: email,
    amount: donation.amount,
    recipient: recipient,
    frequency: donation.frequency,
    tax_deductible: donation.tax_deductible,
  };

  let db = null;
  try {
    db = await dbClient();
    await setDonationEmailed(db, donationToEmail, EmailedStatus.Attempted);
    await sendPaymentEmail(donationToEmail, bankTransferInfo);
    await setDonationEmailed(db, donationToEmail, EmailedStatus.Yes);
  } catch (err) {
    logError(`Error sending payment email for ID "${donation.id}":`, err);
  } finally {
    dbRelease(db);
  }
}
