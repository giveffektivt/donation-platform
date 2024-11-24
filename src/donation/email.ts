import { htmlToText } from "html-to-text";
import juice from "juice";
import path from "node:path";
import {
  type BankTransferInfo,
  dbExecuteInTransaction,
  DonationRecipient,
  type DonationToEmail,
  EmailedStatus,
  failedRecurringDonationTemplate,
  type FailedRecurringDonationToEmail,
  getDonationsToEmail,
  logError,
  membershipReceipt,
  paymentReceipt,
  sendDonationEmail,
  sendReceiptEmail,
  setDonationEmailed,
} from "src";

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

export async function sendMembershipEmail(
  donation: DonationToEmail,
  bank?: BankTransferInfo,
) {
  const { email } = donation;

  const htmlNoInline = membershipReceipt(donation, bank);
  const text = htmlToText(htmlNoInline);
  const html = juice(htmlNoInline);
  const prefix = process.env.VERCEL_ENV === "production" ? "" : "DEV: ";

  const letter = {
    from: '"Giv Effektivt" <kvittering@giveffektivt.dk>',
    replyTo: '"Giv Effektivt Donation" <donation@giveffektivt.dk>',
    to: `<${email}>`,
    subject: `${prefix}Dit medlemskab af Giv Effektivt`,
    attachments: [
      {
        filename: "t.png",
        path: path.join(process.cwd(), "public", "t.png"),
        cid: "twitterLogo",
      },
      {
        filename: "G.png",
        path: path.join(process.cwd(), "public", "G.png"),
        cid: "giveffektivtLogo",
      },
      {
        filename: "f.png",
        path: path.join(process.cwd(), "public", "f.png"),
        cid: "facebookLogo",
      },
      {
        filename: "in.png",
        path: path.join(process.cwd(), "public", "in.png"),
        cid: "linkedinLogo",
      },
    ],
    text,
    html,
  };

  await sendReceiptEmail(letter);
}

export async function sendPaymentEmail(
  donation: DonationToEmail,
  bank?: BankTransferInfo,
) {
  const { email } = donation;

  const htmlNoInline = paymentReceipt(donation, bank);
  const text = htmlToText(htmlNoInline);
  const html = juice(htmlNoInline);
  const prefix = process.env.VERCEL_ENV === "production" ? "" : "DEV: ";
  const bcc =
    (donation.frequency === "once" &&
      donation.amount >=
        Number.parseInt(process.env.BCC_DONATION_ONCE_LARGE_AMOUNT ?? "0")) ||
    (donation.frequency === "monthly" &&
      donation.amount >=
        Number.parseInt(process.env.BCC_DONATION_MONTHLY_LARGE_AMOUNT ?? "0"))
      ? `<${process.env.BCC_DONATION_LARGE_EMAIL}>`
      : undefined;

  const letter = {
    from: '"Giv Effektivt" <kvittering@giveffektivt.dk>',
    replyTo: '"Giv Effektivt Donation" <donation@giveffektivt.dk>',
    to: `<${email}>`,
    bcc,
    subject: `${prefix}Kvittering for donation via Giv Effektivt`,
    attachments: [
      {
        filename: "t.png",
        path: path.join(process.cwd(), "public", "t.png"),
        cid: "twitterLogo",
      },
      {
        filename: "G.png",
        path: path.join(process.cwd(), "public", "G.png"),
        cid: "giveffektivtLogo",
      },
      {
        filename: "f.png",
        path: path.join(process.cwd(), "public", "f.png"),
        cid: "facebookLogo",
      },
      {
        filename: "in.png",
        path: path.join(process.cwd(), "public", "in.png"),
        cid: "linkedinLogo",
      },
    ],
    text,
    html,
  };

  await sendReceiptEmail(letter);
}

export async function sendFailedRecurringDonationEmail(
  info: FailedRecurringDonationToEmail,
) {
  const text = failedRecurringDonationTemplate(info);
  const prefix = process.env.VERCEL_ENV === "production" ? "" : "DEV: ";
  const suffix =
    info.recipient === DonationRecipient.GivEffektivt ? " (medlemskab)" : "";

  const bcc = process.env.BCC_FAILED_RECURRING_DONATION_EMAIL
    ? `<${process.env.BCC_FAILED_RECURRING_DONATION_EMAIL}>`
    : undefined;

  const letter = {
    from: '"Giv Effektivt Donation" <donation@giveffektivt.dk>',
    to: `<${info.donor_email}>`,
    bcc,
    subject: `${prefix}Betalingskort udløbet${suffix}`,
    text,
  };

  await sendDonationEmail(letter);
}
