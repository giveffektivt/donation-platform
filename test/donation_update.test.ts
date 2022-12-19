import {
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  EmailedStatus,
  insertDonationMembershipViaQuickpay,
  insertDonationViaScanpay,
  insertDonorWithSensitiveInfo,
  PaymentMethod,
  setDonationCancelledByQuickpayOrder,
  setDonationEmailed,
  setDonationScanpayId,
} from "src";
import { afterEach, beforeEach, expect, test } from "vitest";
import { findDonationQuickpay, findDonationScanpay } from "./repository";

const client = dbClient();

beforeEach(async () => {
  await dbBeginTransaction(await client);
});

afterEach(async () => {
  await dbRollbackTransaction(await client);
});

test("Update donation to mark it as emailed", async () => {
  const db = await client;

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  expect(donation.emailed).toBe(EmailedStatus.No);

  await setDonationEmailed(db, donation, EmailedStatus.Yes);

  expect((await findDonationQuickpay(db, donation)).emailed).toBe(
    EmailedStatus.Yes
  );
});

test("Update donation to add Scanpay ID", async () => {
  const db = await client;

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationViaScanpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  expect(donation.gateway_metadata).toEqual({});

  await setDonationScanpayId(db, {
    id: donation.id,
    gateway_metadata: {
      scanpay_id: 1234,
    },
  });

  expect((await findDonationScanpay(db, donation)).gateway_metadata).toEqual({
    scanpay_id: 1234,
  });

  await setDonationScanpayId(db, {
    id: donation.id,
    gateway_metadata: {
      scanpay_id: 5678,
    },
  });

  expect((await findDonationScanpay(db, donation)).gateway_metadata).toEqual({
    scanpay_id: 5678,
  });
});

test("Cancel donation by its Quickpay order ID", async () => {
  const db = await client;

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  expect(donation.cancelled).toBe(false);
  expect((await findDonationQuickpay(db, donation)).cancelled).toBe(false);

  await setDonationCancelledByQuickpayOrder(db, "some-incorrect-order");
  expect((await findDonationQuickpay(db, donation)).cancelled).toBe(false);

  await setDonationCancelledByQuickpayOrder(
    db,
    donation.gateway_metadata.quickpay_order
  );
  expect((await findDonationQuickpay(db, donation)).cancelled).toBe(true);
});
