import { ChargeStatus, dbExecuteInTransaction, DonationFrequency, DonationRecipient, PaymentMethod, registerDonationViaQuickpay } from "src";
import { sendCompanyChargeReceipts } from "src/company-receipts/send";
import { afterEach, expect, test, vi } from "vitest";
import { insertChargeWithCreatedAt } from "./repository";

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail }) },
}));

const recipientEmail = "finance@example.com";
const bccEmail = "donations@example.com";

async function donate(db: Parameters<typeof registerDonationViaQuickpay>[0], email: string, tin: string) {
  return registerDonationViaQuickpay(db, {
    email,
    tin,
    amount: 500,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    taxDeductible: true,
    earmarks: [
      { recipient: DonationRecipient.Myggenet, amount: 275 },
      { recipient: DonationRecipient.Malariamedicin, amount: 200 },
      { recipient: DonationRecipient.Drift, amount: 25 },
    ],
  });
}

async function setUpCharges() {
  return dbExecuteInTransaction(async (db) => {
    const company = await donate(db, recipientEmail, "42490903");
    const person = await donate(db, "person@example.com", "111111-1111");
    const unmatched = await donate(db, "not-found@example.com", "12345678");
    await db.query("update donation set created_at = now() - interval '1 year' where id = $1", [company.id]);
    const charge = (donationId: string, status = ChargeStatus.Charged) =>
      insertChargeWithCreatedAt(db, { donation_id: donationId, created_at: new Date(Date.now() - 1000), status });
    const historic = await charge(company.id);
    await db.query("update charge set company_receipt_status = 'skipped' where id = $1", [historic.id]);
    const first = await charge(company.id);
    const second = await charge(company.id);
    await charge(company.id, ChargeStatus.Created);
    const personalCharge = await charge(person.id);
    const {
      rows: [personalReceipt],
    } = await db.query("select company_receipt_status from charge where id = $1", [personalCharge.id]);
    expect(personalReceipt.company_receipt_status).toBe("skipped");
    await charge(unmatched.id);
    return [first.short_id, second.short_id].sort();
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  sendMail.mockReset();
});

function configureReceipts() {
  vi.stubEnv("NTFY_URL", "");
  vi.stubEnv("SMTP_HOST", "smtp.example.com");
  vi.stubEnv("SMTP_USER", "smtp-test");
  vi.stubEnv("SMTP_PASSWORD", "smtp-key-test");
  vi.stubEnv("SMTP_FROM", "receipts@example.com");
}

test("sends once per new eligible charge on an existing donation, even across concurrent cron runs", async () => {
  const expected = await setUpCharges();
  configureReceipts();
  vi.stubEnv("BCC_DONATION_LARGE_EMAIL", bccEmail);
  vi.stubEnv("BCC_DONATION_MONTHLY_LARGE_AMOUNT", "500");
  sendMail.mockResolvedValue({ accepted: [recipientEmail, bccEmail] });
  const lookup = vi.fn(async (url: URL) =>
    Response.json(
      url.searchParams.get("search") === "42490903"
        ? { vat: 42490903, name: "Test & Co <ApS>", address: "Testvej 1", zipcode: "1000", city: "København" }
        : { error: "NOT_FOUND" },
    ),
  );
  vi.stubGlobal("fetch", lookup);

  await Promise.all([sendCompanyChargeReceipts(), sendCompanyChargeReceipts()]);
  expect(lookup.mock.calls.map(([url]) => url.searchParams.get("search")).sort()).toEqual(["12345678", "42490903"]);
  lookup.mockClear();
  await sendCompanyChargeReceipts();
  expect(lookup).not.toHaveBeenCalled();
  expect(sendMail).toHaveBeenCalledTimes(2);
  expect(sendMail.mock.calls.map(([message]) => message.attachments[1].filename).sort()).toEqual(expected.map((id) => `kvittering-${id}.pdf`));
  for (const [message] of sendMail.mock.calls) {
    expect(message).toMatchObject({ to: recipientEmail, bcc: bccEmail });
    expect(message.html).toContain("Test &amp; Co &lt;ApS&gt;");
    const lines = message.text.split("\n").map((line: string) => line.trim());
    const heading = lines.indexOf("Global sundhed og fattigdom");
    expect(heading).toBeGreaterThanOrEqual(0);
    expect(lines.slice(heading + 1, heading + 3)).toEqual([
      expect.stringMatching(/^Myggenet mod malaria: 275,00\b/),
      expect.stringMatching(/^Medicin mod malaria: 200,00\b/),
    ]);
    expect(lines).toEqual(expect.arrayContaining([expect.stringMatching(/^Giv Effektivts arbejde og vækst: 25,00\b/)]));
    expect(message.attachments[1].content.subarray(0, 4).toString()).toBe("%PDF");
  }
});

test("reuses complete company details and refreshes them after the address is cleared", async () => {
  const email = "refresh@example.com";
  configureReceipts();
  sendMail.mockResolvedValue({ accepted: [email] });
  const alert = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const donation = await dbExecuteInTransaction((db) => donate(db, email, "42490903"));
    const addCharge = () =>
      dbExecuteInTransaction((db) =>
        insertChargeWithCreatedAt(db, {
          donation_id: donation.id,
          status: ChargeStatus.Charged,
          created_at: new Date(Date.now() - 1000),
        }),
      );
    const company = (address: string) => Response.json({ vat: 42490903, name: "Test ApS", address, zipcode: "1000", city: "København" });
    const lookup = vi
      .fn()
      .mockResolvedValueOnce(company("Gammel Vej 1"))
      .mockResolvedValueOnce(company("Ny Vej 2"))
      .mockResolvedValueOnce(new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", lookup);

    const pay = async () => {
      await addCharge();
      await sendCompanyChargeReceipts();
    };
    const clearAddress = () => dbExecuteInTransaction((db) => db.query("update donor set address = null where id = $1", [donation.donor_id]));
    await pay();
    await pay();
    expect(lookup).toHaveBeenCalledTimes(1);
    await clearAddress();
    await pay();
    await clearAddress();
    await pay();
    await sendCompanyChargeReceipts();
    expect(lookup).toHaveBeenCalledTimes(3);
    expect(sendMail).toHaveBeenCalledTimes(3);
    const [[first], [cached], [refreshed]] = sendMail.mock.calls;
    expect(first.text).toContain("Gammel Vej 1");
    expect(cached.text).toContain("Gammel Vej 1");
    expect(refreshed.text).toContain("Ny Vej 2");
    expect(alert).toHaveBeenCalledWith(expect.stringContaining("CVR lookup failed"));
  } finally {
    alert.mockRestore();
  }
});
