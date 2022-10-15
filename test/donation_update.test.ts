import {
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  EmailedStatus,
  insertDonationMembershipViaScanpay,
  insertDonorWithSensitiveInfo,
  PaymentMethod,
  setDonationEmailed,
  setDonationScanpayId,
} from "src";
import { afterEach, beforeEach, expect, test } from "vitest";
import { findDonation } from "./repository";

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

  const donation = await insertDonationMembershipViaScanpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  expect(donation.emailed).toBe(EmailedStatus.No);

  await setDonationEmailed(db, donation, EmailedStatus.Yes);

  expect((await findDonation(db, donation)).emailed).toBe(EmailedStatus.Yes);
});

test("Update donation to add Scanpay ID", async () => {
  const db = await client;

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationMembershipViaScanpay(db, {
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

  expect((await findDonation(db, donation)).gateway_metadata).toEqual({
    scanpay_id: 1234,
  });

  await setDonationScanpayId(db, {
    id: donation.id,
    gateway_metadata: {
      scanpay_id: 5678,
    },
  });

  expect((await findDonation(db, donation)).gateway_metadata).toEqual({
    scanpay_id: 5678,
  });
});
