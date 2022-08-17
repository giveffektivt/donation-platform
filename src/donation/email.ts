import { htmlToText } from "html-to-text";
import juice from "juice";
import path from "path";
import {
  BankTransferInfo,
  dbClient,
  DonationRecipient,
  DonationToEmail,
  EmailedStatus,
  getDonationsToEmail,
  membershipReceipt,
  membershipReceiptEn,
  paymentReceipt,
  sendEmail,
  setDonationEmailed,
} from "src";

export async function sendNewEmails() {
  const db = await dbClient();
  try {
    const donationsToEmail = await getDonationsToEmail(db);
    if (donationsToEmail.length < 1) {
      return;
    }

    console.log(
      `Sending ${donationsToEmail.length} donation email(s):`,
      donationsToEmail.map((d) => d.id)
    );
    for (let donation of donationsToEmail) {
      try {
        await setDonationEmailed(db, donation, EmailedStatus.Attempted);
        if (donation.recipient === DonationRecipient.GivEffektivtMembership) {
          await sendMembershipEmail(donation);
        } else {
          await sendPaymentEmail(donation);
        }
        await setDonationEmailed(db, donation, EmailedStatus.Yes);
      } catch (err) {
        console.error(`Error sending email for ID "${donation.id}":`, err);
      }
    }
  } finally {
    db.release();
  }
}

export async function sendMembershipEmail(
  donation: DonationToEmail,
  bank?: BankTransferInfo
) {
  const { email } = donation;

  const inDanish = donation.country === "Denmark";

  const htmlNoInline = inDanish
    ? membershipReceipt(donation, bank)
    : membershipReceiptEn(donation, bank);

  const text = htmlToText(htmlNoInline);
  const html = juice(htmlNoInline);
  const prefix = process.env.VERCEL_ENV === "production" ? "" : "DEV: ";

  const subject = inDanish
    ? `${prefix}Dit medlemskab af Giv Effektivt`
    : `${prefix}Your membership of Giv Effektivt`;

  const letter: any = {
    from: '"Giv Effektivt" <kvittering@giveffektivt.dk>',
    replyTo: '"Giv Effektivt Donation" <donation@giveffektivt.dk>',
    to: `<${email}>`,
    subject: subject,
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

  await sendEmail(letter);
}

export async function sendPaymentEmail(
  donation: DonationToEmail,
  bank?: BankTransferInfo
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

  await sendEmail(letter);
}
