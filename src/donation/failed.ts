import {
  dbExecuteInTransaction,
  getFailedRecurringDonations,
  recreateQuickpayFailedRecurringDonation,
  sendFailedRecurringDonationEmail,
} from "src";

export async function sendFailedRecurringDonationEmails(ids: string[]) {
  dbExecuteInTransaction(async (db) => {
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
