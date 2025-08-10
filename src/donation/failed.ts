import type { PoolClient } from "pg";
import {
  dbExecuteInTransaction,
  generateRenewPaymentUrl,
  getDonationToUpdateQuickpayPaymentInfoById,
  getFailedRecurringDonations,
  logError,
  recreateQuickpayFailedRecurringDonation,
  sendFailedRecurringDonationEmail,
} from "src";

export async function sendFailedRecurringDonationEmails(
  db: PoolClient,
  ids: string[],
) {
  for (const info of await getFailedRecurringDonations(db)) {
    if (!ids.includes(info.donor_id)) {
      continue;
    }

    try {
      await sendFailedRecurringDonationEmail(
        info.donor_id,
        info.donor_email,
        info.recipient,
        info.amount,
        info.donor_name,
        await recreateQuickpayFailedRecurringDonation(db, info.donation_id),
      );
      console.log(
        `Sent new payment link for a failed recurring donation: ${info.donation_id}`,
      );
    } catch (err) {
      logError(
        `Error sending new payment link for a failed recurring donation: ${info.donation_id}`,
        err,
      );
    }
  }
}

export async function getRenewPaymentLink(
  donation_id: string,
): Promise<string | null> {
  return await dbExecuteInTransaction(async (db) => {
    const donation = await getDonationToUpdateQuickpayPaymentInfoById(
      db,
      donation_id,
    );
    if (donation == null) {
      return null;
    }
    return await generateRenewPaymentUrl(donation);
  });
}
