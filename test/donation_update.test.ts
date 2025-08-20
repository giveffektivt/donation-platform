import {
  DonationFrequency,
  DonationRecipient,
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  EmailedStatus,
  PaymentMethod,
  registerDonationViaQuickpay,
  setDonationCancelledByQuickpayOrder,
  setDonationEmailed,
  setDonationMethodByQuickpayOrder,
} from "src";
import { afterEach, beforeEach, expect, test } from "vitest";
import { findAllDonations } from "./repository";

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
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  expect(donation.emailed).toBe(EmailedStatus.No);

  await setDonationEmailed(db, donation, EmailedStatus.Yes);

  expect(await findAllDonations(db)).toMatchObject([
    { emailed: EmailedStatus.Yes },
  ]);
});

test("Cancel donation by its Quickpay order ID", async () => {
  const db = await client;

  const donation = await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 100,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  expect(donation.cancelled).toBe(false);
  expect(await findAllDonations(db)).toMatchObject([{ cancelled: false }]);
  await setDonationCancelledByQuickpayOrder(db, "some-incorrect-order");
  expect(await findAllDonations(db)).toMatchObject([{ cancelled: false }]);
  await setDonationCancelledByQuickpayOrder(
    db,
    donation.gateway_metadata.quickpay_order,
  );
  expect(await findAllDonations(db)).toMatchObject([{ cancelled: true }]);
});

test("Update donation payment method by its Quickpay order ID", async () => {
  const db = await client;

  const donation = await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 100,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  expect(await findAllDonations(db)).toMatchObject([
    { method: PaymentMethod.CreditCard },
  ]);

  await setDonationMethodByQuickpayOrder(
    db,
    "some-incorrect-order",
    PaymentMethod.MobilePay,
  );
  expect(await findAllDonations(db)).toMatchObject([
    { method: PaymentMethod.CreditCard },
  ]);

  await setDonationMethodByQuickpayOrder(
    db,
    donation.gateway_metadata.quickpay_order,
    PaymentMethod.MobilePay,
  );
  expect(await findAllDonations(db)).toMatchObject([
    { method: PaymentMethod.MobilePay },
  ]);
});
