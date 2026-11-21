import type { DonationToEmail } from "src/donation/types";

export function getLargeDonationBcc({
  email,
  amount,
  frequency,
}: Pick<DonationToEmail, "email" | "amount" | "frequency">) {
  const bcc = process.env.BCC_DONATION_LARGE_EMAIL;
  if (!bcc || bcc === email) return undefined;

  if (
    (frequency === "once" &&
      amount >=
        Number.parseInt(process.env.BCC_DONATION_ONCE_LARGE_AMOUNT ?? "0")) ||
    (frequency === "monthly" &&
      amount >=
        Number.parseInt(process.env.BCC_DONATION_MONTHLY_LARGE_AMOUNT ?? "0"))
  ) {
    return bcc;
  }
}
