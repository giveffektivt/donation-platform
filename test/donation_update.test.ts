import {
  DonationFrequency,
  DonationRecipient,
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  EmailedStatus,
  PaymentMethod,
  setDonationCancelledByQuickpayOrder,
  setDonationEmailed,
  setDonationMethodByQuickpayOrder,
  registerDonationViaQuickpay,
} from "src";
import { afterEach, beforeEach, expect, test } from "vitest";
import { findDonationQuickpay } from "./repository";

const client = dbClient();

beforeEach(async () => {
  await dbBeginTransaction(await client);
});

afterEach(async () => {
  await dbRollbackTransaction(await client);
});

test("Update donation to mark it as emailed", async () => {
  const db = await client;

  const donation = await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 100,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    tax_deductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  expect(donation.emailed).toBe(EmailedStatus.No);

  await setDonationEmailed(db, donation, EmailedStatus.Yes);

  expect((await findDonationQuickpay(db, donation)).emailed).toBe(
    EmailedStatus.Yes,
  );
});

test("Cancel donation by its Quickpay order ID", async () => {
  const db = await client;

  const donation = await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 100,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    tax_deductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  expect(donation.cancelled).toBe(false);
  expect((await findDonationQuickpay(db, donation)).cancelled).toBe(false);

  await setDonationCancelledByQuickpayOrder(db, "some-incorrect-order");
  expect((await findDonationQuickpay(db, donation)).cancelled).toBe(false);

  await setDonationCancelledByQuickpayOrder(
    db,
    donation.gateway_metadata.quickpay_order,
  );
  expect((await findDonationQuickpay(db, donation)).cancelled).toBe(true);
});

test("Update donation payment method by its Quickpay order ID", async () => {
  const db = await client;

  const donation = await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 100,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    tax_deductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  expect((await findDonationQuickpay(db, donation)).method).toBe(
    PaymentMethod.CreditCard,
  );

  await setDonationMethodByQuickpayOrder(
    db,
    "some-incorrect-order",
    PaymentMethod.MobilePay,
  );
  expect((await findDonationQuickpay(db, donation)).method).toBe(
    PaymentMethod.CreditCard,
  );

  await setDonationMethodByQuickpayOrder(
    db,
    donation.gateway_metadata.quickpay_order,
    PaymentMethod.MobilePay,
  );
  expect((await findDonationQuickpay(db, donation)).method).toBe(
    PaymentMethod.MobilePay,
  );
});
