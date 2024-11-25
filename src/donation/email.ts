import { EmailParams, MailerSend, Recipient } from "mailersend";
import {
  type BankTransferInfo,
  dbExecuteInTransaction,
  DonationRecipient,
  type DonationToEmail,
  EmailedStatus,
  type FailedRecurringDonationToEmail,
  getDonationsToEmail,
  logError,
  setDonationEmailed,
} from "src";

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY,
});

export async function sendNewEmails() {
  await dbExecuteInTransaction(async (db) => {
    const donationsToEmail = await getDonationsToEmail(db);
    if (donationsToEmail.length < 1) {
      return;
    }

    console.log(
      `Sending ${donationsToEmail.length} donation email(s):`,
      donationsToEmail.map((d) => d.id),
    );
    for (const donation of donationsToEmail) {
      try {
        await setDonationEmailed(db, donation, EmailedStatus.Attempted);
        if (donation.recipient === DonationRecipient.GivEffektivt) {
          await sendMembershipEmail(donation);
        } else {
          await sendPaymentEmail(donation);
        }
        await setDonationEmailed(db, donation, EmailedStatus.Yes);
      } catch (err) {
        logError(`Error sending email for ID "${donation.id}":`, err);
      }
    }
  });
}

export async function sendMembershipEmail(donation: DonationToEmail) {
  const emailParams = new EmailParams()
    .setTo([new Recipient(donation.email)])
    .setTemplateId(process.env.MAILERSEND_TEMPLATE_MEMBERSHIP)
    .setPersonalization([
      {
        email: donation.email,
        data: {
          donation_id: donation.id,
          subject_prefix:
            process.env.VERCEL_ENV === "production" ? "" : "DEV: ",
        },
      },
    ]);

  const result = await mailerSend.email.send(emailParams);
  if (result.statusCode !== 202) {
    throw new Error(`Failed to send email: ${JSON.stringify(result)}`);
  }

  if (result.body) {
    logError(
      `Email for membership ID ${donation.id} was probably sent, but with possible errors or warnings: ${JSON.stringify(result.body)}`,
    );
  }
}

export async function sendPaymentEmail(
  donation: DonationToEmail,
  bank?: BankTransferInfo,
) {
  const emailParams = new EmailParams()
    .setTo([new Recipient(donation.email)])
    .setTemplateId(process.env.MAILERSEND_TEMPLATE_DONATION)
    .setPersonalization([
      {
        email: donation.email,
        data: {
          amount: donation.amount.toLocaleString("da-DK"),
          donation_id: donation.id,
          frequency: donation.frequency,
          tax_deductible: donation.tax_deductible,
          recipient: donation.recipient,
          bank_msg: bank?.msg ?? null,
          subject_prefix:
            process.env.VERCEL_ENV === "production" ? "" : "DEV: ",
        },
      },
    ]);

  const isDonationOnceLarge =
    donation.frequency === "once" &&
    donation.amount >=
      Number.parseInt(process.env.BCC_DONATION_ONCE_LARGE_AMOUNT ?? "0");

  const isDonationMonthlyLarge =
    donation.frequency === "monthly" &&
    donation.amount >=
      Number.parseInt(process.env.BCC_DONATION_MONTHLY_LARGE_AMOUNT ?? "0");

  if (
    process.env.BCC_DONATION_LARGE_EMAIL &&
    (isDonationOnceLarge || isDonationMonthlyLarge)
  ) {
    emailParams.setBcc([new Recipient(process.env.BCC_DONATION_LARGE_EMAIL)]);
  }

  const result = await mailerSend.email.send(emailParams);
  if (result.statusCode !== 202) {
    throw new Error(`Failed to send email: ${JSON.stringify(result)}`);
  }

  if (result.body) {
    logError(
      `Email for donation ID ${donation.id} was probably sent, but with possible errors or warnings: ${JSON.stringify(result.body)}`,
    );
  }
}

export async function sendFailedRecurringDonationEmail(
  info: FailedRecurringDonationToEmail,
) {
  const emailParams = new EmailParams()
    .setTo([new Recipient(info.donor_email)])
    .setTemplateId(process.env.MAILERSEND_TEMPLATE_MEMBERSHIP)
    .setPersonalization([
      {
        email: info.donor_email,
        data: {
          amount: info.amount.toLocaleString("da-DK"),
          name: info.donor_name,
          recipient: info.recipient,
          payment_link: info.payment_link,
          subject_prefix:
            process.env.VERCEL_ENV === "production" ? "" : "DEV: ",
        },
      },
    ]);

  const result = await mailerSend.email.send(emailParams);
  if (result.statusCode !== 202) {
    throw new Error(`Failed to send email: ${JSON.stringify(result)}`);
  }

  if (result.body) {
    logError(
      `Email for failed recurring donation to donor ID ${info.donor_id} was probably sent, but with possible errors or warnings: ${JSON.stringify(result.body)}`,
    );
  }
}
