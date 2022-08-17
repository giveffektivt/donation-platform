import {
  ChargeStatus,
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  insertCharge,
  insertDonationMembershipViaScanPay,
  insertDonorWithSensitiveInfo,
  insertInitialCharge,
  PaymentMethod,
  setChargeWithGatewayResponseByShortId,
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

  const donation = await insertDonationMembershipViaScanPay(db, {
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

test("Insert initial charge for a donation only once", async () => {
  const db = await client;

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationMembershipViaScanPay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  const charge = await insertInitialCharge(db, {
    donation_id: donation.id,
  });

  expect(charge).toMatchObject({
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  expect(charge.short_id).toHaveLength(4);

  expect(await findAllCharges(db)).toHaveLength(1);

  await insertInitialCharge(db, {
    donation_id: donation.id,
  });

  expect(await findAllCharges(db)).toHaveLength(1);
});

test("Update charge status", async () => {
  const db = await client;

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationMembershipViaScanPay(db, {
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

test("Update charge ScanPay idempotency key", async () => {
  const db = await client;

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationMembershipViaScanPay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
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

test("Update charge gateway response", async () => {
  const db = await client;

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationMembershipViaScanPay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  const charge = await insertCharge(db, {
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  expect(charge.gateway_response).toEqual({});

  await setChargeWithGatewayResponseByShortId(db, {
    short_id: charge.short_id,
    status: ChargeStatus.Charged,
    gateway_response: {
      somekey: "1234",
      otherkey: 5678,
    },
  });

  expect(await findCharge(db, charge)).toMatchObject({
    donation_id: donation.id,
    status: ChargeStatus.Charged,
    gateway_response: {
      somekey: "1234",
      otherkey: 5678,
    },
  });

  await setChargeWithGatewayResponseByShortId(db, {
    short_id: charge.short_id,
    status: ChargeStatus.Refunded,
    gateway_response: {
      somekey: "5678",
      otherkey: 1234,
    },
  });

  expect(await findCharge(db, charge)).toMatchObject({
    donation_id: donation.id,
    status: ChargeStatus.Refunded,
    gateway_response: {
      somekey: "5678",
      otherkey: 1234,
    },
  });
});
