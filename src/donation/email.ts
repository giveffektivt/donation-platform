import { addYears, differenceInDays, startOfYear } from "date-fns";
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
        logError(`Error sending email for ID "${donation.id}"`, err);
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
          subject_prefix:
            process.env.VERCEL_ENV === "production" ? "" : "DEV: ",
          donation_id: donation.id,
          recipient: donation.recipient,
        },
      },
    ]);

  const result = await mailerSend.email.send(emailParams);
  if (result.statusCode !== 202) {
    throw new Error(`Failed to send email: ${JSON.stringify(result)}`);
  }

  if (result.body) {
    logError(
      `Email for membership ID ${donation.id} was probably sent, but with possible errors or warnings`,
      result.body,
    );
  }
}

export async function sendPaymentEmail(
  donation: DonationToEmail,
  bank?: BankTransferInfo,
) {
  const days_until_next_year = differenceInDays(
    startOfYear(addYears(new Date(), 1)),
    new Date(),
  );

  const emailParams = new EmailParams()
    .setTo([new Recipient(donation.email)])
    .setTemplateId(process.env.MAILERSEND_TEMPLATE_DONATION)
    .setPersonalization([
      {
        email: donation.email,
        data: {
          subject_prefix:
            process.env.VERCEL_ENV === "production" ? "" : "DEV: ",
          donation_id: donation.id,
          recipient: donation.recipient,

          amount: donation.amount.toLocaleString("da-DK"),
          frequency: donation.frequency,
          tax_deductible: donation.tax_deductible,
          bank_msg: bank?.msg ?? null,
          days_until_next_year,
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
    process.env.BCC_DONATION_LARGE_EMAIL !== donation.email &&
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
      `Email for donation ID ${donation.id} was probably sent, but with possible errors or warnings`,
      result.body,
    );
  }
}

export async function sendFailedRecurringDonationEmail(
  info: FailedRecurringDonationToEmail,
) {
  const emailParams = new EmailParams()
    .setTo([new Recipient(info.donor_email)])
    .setTemplateId(process.env.MAILERSEND_TEMPLATE_PAYMENT_EXPIRED)
    .setPersonalization([
      {
        email: info.donor_email,
        data: {
          subject_prefix:
            process.env.VERCEL_ENV === "production" ? "" : "DEV: ",
          amount: info.amount.toLocaleString("da-DK"),
          name: info.donor_name ?? null,
          recipient: info.recipient,
          payment_link: info.payment_link,
        },
      },
    ]);

  if (
    process.env.BCC_FAILED_RECURRING_DONATION_EMAIL &&
    process.env.BCC_FAILED_RECURRING_DONATION_EMAIL !== info.donor_email
  ) {
    emailParams.setBcc([
      new Recipient(process.env.BCC_FAILED_RECURRING_DONATION_EMAIL),
    ]);
  }

  const result = await mailerSend.email.send(emailParams);
  if (result.statusCode !== 202) {
    throw new Error(`Failed to send email: ${JSON.stringify(result)}`);
  }

  if (result.body) {
    logError(
      `Email for failed recurring donation to donor ID ${info.donor_id} was probably sent, but with possible errors or warnings`,
      result.body,
    );
  }
}
