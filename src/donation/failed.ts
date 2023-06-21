import {
  dbExecuteInTransaction,
  generateRenewPaymentUrl,
  getDonationToUpdateQuickpayPaymentInfoById,
  getFailedRecurringDonations,
  recreateQuickpayFailedRecurringDonation,
  sendFailedRecurringDonationEmail,
} from "src";

export async function sendFailedRecurringDonationEmails(ids: string[]) {
  await dbExecuteInTransaction(async (db) => {
    for (let info of await getFailedRecurringDonations(db)) {
      if (!ids.includes(info.donor_id)) {
        continue;
      }

      try {
        console.log(
          `Sending new payment link for a failed recurring donation: ${info.donation_id}`
        );
        await sendFailedRecurringDonationEmail({
          donor_email: info.donor_email,
          donor_name: info.donor_name,
          recipient: info.recipient,
          amount: info.amount,
          payment_link: await recreateQuickpayFailedRecurringDonation(info),
        });
      } catch (err) {
        console.error(
          `Error sending new payment link for a failed recurring donation: ${info.donation_id}`,
          err
        );
      }
    }
  });
}

export async function getRenewPaymentLink(
  donation_id: string
): Promise<string | null> {
  return await dbExecuteInTransaction(async (db) => {
    const donation = await getDonationToUpdateQuickpayPaymentInfoById(
      db,
      donation_id
    );
    if (donation == null) {
      return null;
    }
    return await generateRenewPaymentUrl(donation);
  });
}
