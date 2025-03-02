import { addYears, differenceInDays, startOfYear } from "date-fns";
import { EmailParams, MailerSend, Recipient } from "mailersend";
import {
  type BankTransferInfo,
  dbExecuteInTransaction,
  DonationRecipient,
  type DonationToEmail,
  EmailedStatus,
  type FailedRecurringDonationToEmail,
  getBankAccount,
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
        if (donation.recipient === DonationRecipient.GivEffektivtsMedlemskab) {
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
          bank_account: getBankAccount(donation.recipient),
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
  donor_id: string,
  email: string,
  recipient: DonationRecipient,
  amount: number,
  donor_name?: string,
  payment_link?: string,
) {
  const emailParams = new EmailParams()
    .setTo([new Recipient(email)])
    .setTemplateId(process.env.MAILERSEND_TEMPLATE_PAYMENT_EXPIRED)
    .setPersonalization([
      {
        email,
        data: {
          subject_prefix:
            process.env.VERCEL_ENV === "production" ? "" : "DEV: ",
          amount: amount.toLocaleString("da-DK"),
          name: donor_name ?? null,
          recipient,
          payment_link: payment_link ?? null,
        },
      },
    ]);

  if (
    process.env.BCC_FAILED_RECURRING_DONATION_EMAIL &&
    process.env.BCC_FAILED_RECURRING_DONATION_EMAIL !== email
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
      `Email for failed recurring donation to donor ID ${donor_id} was probably sent, but with possible errors or warnings`,
      result.body,
    );
  }
}
