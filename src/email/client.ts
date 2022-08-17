import nodemailer from "nodemailer";

const client = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER_NAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const sendEmail = async (letter: any) => {
  await client.sendMail(letter);
};
