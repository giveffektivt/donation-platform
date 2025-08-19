import {
  ChargeStatus,
  DonationFrequency,
  DonationRecipient,
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  insertCharge,
  insertInitialChargeQuickpay,
  PaymentMethod,
  registerDonationViaQuickpay,
  setChargeStatus,
} from "src";
import { afterEach, beforeEach, expect, test } from "vitest";
import { findAllCharges } from "./repository";

const client = dbClient();

beforeEach(async () => {
  await dbBeginTransaction(await client);
});

afterEach(async () => {
  await dbRollbackTransaction(await client);
});

test("Insert charge for a donation", async () => {
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

  const charge = await insertCharge(db, {
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  expect(charge).toMatchObject({
    id: charge.id,
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  expect(await findAllCharges(db)).toMatchObject([
    { id: charge.id, donation_id: donation.id, status: ChargeStatus.Created },
  ]);

  expect(charge.short_id.substring(0, 2)).toEqual("c-");
  expect(charge.short_id).toHaveLength(6);
});

test("Insert initial charge for a donation via Quickpay only once", async () => {
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

  const charge = await insertInitialChargeQuickpay(
    db,
    donation.gateway_metadata.quickpay_order,
  );

  expect(charge).toMatchObject({
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });
  expect(await findAllCharges(db)).toMatchObject([
    { id: charge.id, donation_id: donation.id, status: ChargeStatus.Created },
  ]);

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

  const donation = await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 100,
    frequency: DonationFrequency.Match,
    method: PaymentMethod.CreditCard,
    tax_deductible: false,
    fundraiser_id: "00000000-0000-0000-0000-000000000000",
    message: "Thanks!",
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
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

  const charge = await insertCharge(db, {
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  expect(charge.status).toBe(ChargeStatus.Created);
  expect(await findAllCharges(db)).toMatchObject([
    { id: charge.id, donation_id: donation.id, status: ChargeStatus.Created },
  ]);

  await setChargeStatus(db, { id: charge.id, status: ChargeStatus.Error });

  expect(await findAllCharges(db)).toMatchObject([
    { id: charge.id, donation_id: donation.id, status: ChargeStatus.Error },
  ]);
});
