import { htmlToText } from "html-to-text";
import juice from "juice";
import path from "path";
import {
  BankTransferInfo,
  dbExecuteInTransaction,
  DonationRecipient,
  DonationToEmail,
  EmailedStatus,
  failedRecurringDonationTemplate,
  FailedRecurringDonationToEmail,
  getDonationsToEmail,
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
    for (let donation of donationsToEmail) {
      try {
        await setDonationEmailed(db, donation, EmailedStatus.Attempted);
        if (donation.recipient === DonationRecipient.GivEffektivt) {
          await sendMembershipEmail(donation);
        } else {
          await sendPaymentEmail(donation);
        }
        await setDonationEmailed(db, donation, EmailedStatus.Yes);
      } catch (err) {
        console.error(`Error sending email for ID "${donation.id}":`, err);
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

  const letter: any = {
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

  const letter: any = {
    from: '"Giv Effektivt" <kvittering@giveffektivt.dk>',
    replyTo: '"Giv Effektivt Donation" <donation@giveffektivt.dk>',
    to: `<${email}>`,
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

  const letter: any = {
    from: '"Giv Effektivt Donation" <donation@giveffektivt.dk>',
    to: `<${info.donor_email}>`,
    subject: `${prefix}Betalingskort udløbet${suffix}`,
    text,
  };

  await sendDonationEmail(letter);
}
