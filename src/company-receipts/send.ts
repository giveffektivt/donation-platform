import nodemailer from "nodemailer";
import { dbExecuteInTransaction } from "src/db/client";
import { getLargeDonationBcc } from "src/donation/receipt-bcc";
import { logError } from "src/helpers/ntfy";
import { companyAddressLines, lookupDanishCompany } from "./cvr";
import { renderCompanyReceipt } from "./render";
import {
  getCompanyCharges,
  lockCompanyDetails,
  markCompanyChargeReceiptSent,
  saveCompanyDetails,
  setCompanyChargeReceiptStatus,
} from "./repository";

export async function sendCompanyChargeReceipts() {
  const charges = await dbExecuteInTransaction(getCompanyCharges);
  if (!charges.length) return;
  const { SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  const port = Number(process.env.SMTP_PORT ?? "587");
  if (
    !SMTP_HOST ||
    !SMTP_USER ||
    !SMTP_PASSWORD ||
    !SMTP_FROM ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error("Company receipts require valid SMTP settings");
  }

  const smtp = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    connectionTimeout: 5_000,
    greetingTimeout: 5_000,
    socketTimeout: 10_000,
  });
  const deadline = Date.now() + 30_000;
  for (const charge of charges) {
    if (Date.now() >= deadline) break;
    const setStatus = (status: "failed" | "not_found" | "attempted") =>
      dbExecuteInTransaction((db) =>
        setCompanyChargeReceiptStatus(db, charge.id, status),
      );

    let receipt;
    try {
      const company = await dbExecuteInTransaction(async (db) => {
        const details = await lockCompanyDetails(db, charge);
        if (!details) return;
        const { name, address, zipcode, city } = details;
        if (
          name?.trim() &&
          address?.trim() &&
          zipcode?.trim() &&
          city?.trim()
        ) {
          return { cvr: charge.cvr, name, address, zipcode, city };
        }

        const found = await lookupDanishCompany(charge.cvr).catch(
          () => undefined,
        );
        if (!found) {
          await setCompanyChargeReceiptStatus(
            db,
            charge.id,
            found === null ? "not_found" : "failed",
          );
          return found === null ? undefined : "lookup_failed";
        }
        await saveCompanyDetails(db, charge.donor_id, found);
        return found;
      });
      if (company === "lookup_failed") {
        await logError(
          `CVR lookup failed for charge ${charge.id}; no receipt sent`,
        );
        continue;
      }
      if (!company) continue;
      receipt = await renderCompanyReceipt(
        charge,
        companyAddressLines(company),
      );
    } catch {
      await setStatus("failed");
      await logError(
        `Could not prepare company receipt for charge ${charge.id}`,
      );
      continue;
    }

    if (!(await setStatus("attempted"))) continue;
    try {
      const result = await smtp.sendMail({
        from: { name: "Giv Effektivt", address: SMTP_FROM },
        to: charge.email,
        bcc: getLargeDonationBcc(charge),
        subject: `${process.env.VERCEL_ENV === "production" ? "" : "DEV: "}${receipt.title} (${charge.short_id})`,
        html: receipt.html,
        text: receipt.text,
        attachments: receipt.attachments,
      });
      if (
        !result.accepted.some(
          (address) => address.toLowerCase() === charge.email.toLowerCase(),
        )
      ) {
        throw new Error("SMTP did not accept recipient");
      }
      await dbExecuteInTransaction((db) =>
        markCompanyChargeReceiptSent(db, charge.id),
      );
    } catch {
      await logError(
        `Delivery unconfirmed for company receipt on charge ${charge.id}; check SMTP delivery logs before retrying`,
      );
    }
  }
}
