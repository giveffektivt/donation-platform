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
  type NewDonation,
  registerDonationViaBankTransfer,
  sendPaymentEmail,
  setDonationEmailed,
} from "src";

export async function processBankTransferDonation(
  payload: NewDonation,
): Promise<[string, string]> {
  const donation = await dbExecuteInTransaction(
    async (db) => await insertBankTransferData(db, payload),
  );
  await sendEmails(payload.email, payload.earmarks, donation);
  return [donation.gateway_metadata.bank_msg, donation.donor_id];
}

export async function insertBankTransferData(
  db: PoolClient,
  payload: NewDonation,
): Promise<DonationWithGatewayInfoBankTransfer> {
  return await registerDonationViaBankTransfer(db, payload);
}

async function sendEmails(
  email: string,
  earmarks: { recipient: DonationRecipient; percentage: number }[],
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
    recipient: earmarks?.length === 1 ? earmarks[0].recipient : undefined,
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
