import {
  ChargeStatus,
  DonationFrequency,
  DonationRecipient,
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  insertCharge,
  insertDonationViaQuickpay,
  insertDonor,
  insertInitialChargeQuickpay,
  insertMembershipViaQuickpay,
  PaymentMethod,
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

  const donor = await insertDonor(db, {
    email: "hello@example.com",
  });

  const donation = await insertMembershipViaQuickpay(db, {
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

  expect(charge.short_id.substring(0, 2)).toEqual("c-");
  expect(charge.short_id).toHaveLength(6);
});

test("Insert initial charge for a donation via Quickpay only once", async () => {
  const db = await client;

  const donor = await insertDonor(db, {
    email: "hello@example.com",
  });

  const donation = await insertMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  const charge = await insertInitialChargeQuickpay(
    db,
    donation.gateway_metadata.quickpay_order,
  );

  expect(charge).toMatchObject({
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  expect(charge.short_id.substring(0, 2)).toEqual("c-");
  expect(charge.short_id).toHaveLength(6);

  expect(await findAllCharges(db)).toHaveLength(1);

  await insertInitialChargeQuickpay(
    db,
    donation.gateway_metadata.quickpay_order,
  );

  expect(await findAllCharges(db)).toHaveLength(1);
});

test("Do not insert initial charge for a matching donation", async () => {
  const db = await client;

  const donor = await insertDonor(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
    amount: 0.1,
    recipient: DonationRecipient.MyggenetModMalaria,
    frequency: DonationFrequency.Match,
    tax_deductible: false,
    fundraiser_id: "00000000-0000-0000-0000-000000000000",
  });

  const charge = await insertInitialChargeQuickpay(
    db,
    donation.gateway_metadata.quickpay_order,
  );

  expect(charge).toBeUndefined();
  expect(await findAllCharges(db)).toHaveLength(0);
});

test("Update charge status", async () => {
  const db = await client;

  const donor = await insertDonor(db, {
    email: "hello@example.com",
  });

  const donation = await insertMembershipViaQuickpay(db, {
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
