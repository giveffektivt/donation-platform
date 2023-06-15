import nodemailer from "nodemailer";

const receiptClient = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_RECEIPT_USERNAME,
    pass: process.env.EMAIL_RECEIPT_PASSWORD,
  },
});

const donationClient = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_DONATION_USERNAME,
    pass: process.env.EMAIL_DONATION_PASSWORD,
  },
});

export const sendReceiptEmail = async (letter: any) => {
  await receiptClient.sendMail(letter);
};

export const sendDonationEmail = async (letter: any) => {
  await donationClient.sendMail(letter);
};
