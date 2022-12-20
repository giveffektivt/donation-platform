import {
  ChargeStatus,
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  DonationFrequency,
  DonationRecipient,
  insertCharge,
  insertDonationMembershipViaQuickpay,
  insertDonationViaScanpay,
  insertDonorWithSensitiveInfo,
  insertInitialChargeQuickpay,
  insertInitialChargeScanpay,
  PaymentMethod,
  setChargeIdempotencyKey,
  setChargeStatus,
} from "src";
import { afterEach, beforeEach, expect, test } from "vitest";
import { findAllCharges, findCharge } from "./repository";

const client = dbClient();

beforeEach(async () => {
  await dbBeginTransaction(await client);
});

afterEach(async () => {
  await dbRollbackTransaction(await client);
});

test("Insert charge for a donation", async () => {
  const db = await client;

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  const charge = await insertCharge(db, {
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  expect(charge).toMatchObject({
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  expect(charge.short_id).toHaveLength(4);
});

test("Insert initial charge for a donation via Scanpay only once", async () => {
  const db = await client;

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationViaScanpay(db, {
    donor_id: donor.id,
    amount: 88,
    recipient: DonationRecipient.MyggenetModMalaria,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    tax_deductible: false,
  });

  const charge = await insertInitialChargeScanpay(db, {
    donation_id: donation.id,
  });

  expect(charge).toMatchObject({
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  expect(charge.short_id).toHaveLength(4);

  expect(await findAllCharges(db)).toHaveLength(1);

  await insertInitialChargeScanpay(db, {
    donation_id: donation.id,
  });

  expect(await findAllCharges(db)).toHaveLength(1);
});

test("Insert initial charge for a donation via Quickpay only once", async () => {
  const db = await client;

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  const charge = await insertInitialChargeQuickpay(
    db,
    donation.gateway_metadata.quickpay_order
  );

  expect(charge).toMatchObject({
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  expect(charge.short_id).toHaveLength(4);

  expect(await findAllCharges(db)).toHaveLength(1);

  await insertInitialChargeQuickpay(
    db,
    donation.gateway_metadata.quickpay_order
  );

  expect(await findAllCharges(db)).toHaveLength(1);
});

test("Update charge status", async () => {
  const db = await client;

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  const charge = await insertCharge(db, {
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  expect(charge.status).toBe(ChargeStatus.Created);

  await setChargeStatus(db, { id: charge.id, status: ChargeStatus.Error });

  expect((await findCharge(db, charge)).status).toBe(ChargeStatus.Error);
});

test("Update charge Scanpay idempotency key", async () => {
  const db = await client;

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationViaScanpay(db, {
    donor_id: donor.id,
    amount: 88,
    recipient: DonationRecipient.MyggenetModMalaria,
    frequency: DonationFrequency.Once,
    method: PaymentMethod.CreditCard,
    tax_deductible: true,
  });

  const charge = await insertCharge(db, {
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  expect(charge.gateway_metadata).toEqual({});

  await setChargeIdempotencyKey(db, {
    id: charge.id,
    gateway_metadata: {
      idempotency_key: "1234",
    },
  });

  expect((await findCharge(db, charge)).gateway_metadata).toEqual({
    idempotency_key: "1234",
  });

  await setChargeIdempotencyKey(db, {
    id: charge.id,
    gateway_metadata: {
      idempotency_key: "5678",
    },
  });

  expect((await findCharge(db, charge)).gateway_metadata).toEqual({
    idempotency_key: "5678",
  });
});
