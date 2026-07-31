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
  sendReceiptEmail,
  setDonationEmailed,
  shouldSuggestMembership,
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
  earmarks: { recipient: DonationRecipient; amount: number }[],
  donation: DonationWithGatewayInfoBankTransfer,
) {
  console.log(`Sending bank transfer donation email: ${donation.id}`);

  const bankTransferInfo: BankTransferInfo = {
    amount: donation.amount,
    msg: donation.gateway_metadata.bank_msg,
  };

  let db = null;
  try {
    db = await dbClient();
    const donationToEmail: DonationToEmail = {
      id: donation.id,
      email: email,
      amount: donation.amount,
      earmarks,
      frequency: donation.frequency,
      tax_deductible: donation.tax_deductible,
      suggest_membership: await shouldSuggestMembership(db, donation.donor_id),
    };

    await setDonationEmailed(db, donationToEmail.id, EmailedStatus.Attempted);
    await sendReceiptEmail(donationToEmail, bankTransferInfo);
    await setDonationEmailed(db, donationToEmail.id, EmailedStatus.Yes);
  } catch (err) {
    logError(`Error sending payment email for ID "${donation.id}":`, err);
  } finally {
    dbRelease(db);
  }
}
