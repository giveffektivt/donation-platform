import {
  DonationFrequency,
  DonationRecipient,
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  EmailedStatus,
  insertDonor,
  insertMembershipViaQuickpay,
  PaymentMethod,
  setDonationCancelledById,
  setDonationCancelledByQuickpayOrder,
  setDonationEmailed,
  setDonationMethodByQuickpayOrder,
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

  const donor = await insertDonor(db, {
    email: "hello@example.com",
  });

  const donation = await insertMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  expect(donation.emailed).toBe(EmailedStatus.No);

  await setDonationEmailed(db, donation, EmailedStatus.Yes);

  expect((await findDonationQuickpay(db, donation)).emailed).toBe(
    EmailedStatus.Yes,
  );
});

test("Cancel donation by its Quickpay order ID", async () => {
  const db = await client;

  const donor = await insertDonor(db, {
    email: "hello@example.com",
  });

  const donation = await insertMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
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

test("Cancel donation by its ID", async () => {
  const db = await client;

  const donor = await insertDonor(db, {
    email: "hello@example.com",
  });

  const donation = await insertMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  expect(donation.cancelled).toBe(false);
  expect((await findDonationQuickpay(db, donation)).cancelled).toBe(false);

  await setDonationCancelledById(db, "00000000-0000-0000-0000-000000000000");
  expect((await findDonationQuickpay(db, donation)).cancelled).toBe(false);

  await setDonationCancelledById(db, donation.id);
  expect((await findDonationQuickpay(db, donation)).cancelled).toBe(true);
});

test("Update donation payment method by its Quickpay order ID", async () => {
  const db = await client;

  const donor = await insertDonor(db, {
    email: "hello@example.com",
  });

  const donation = await insertMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
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
