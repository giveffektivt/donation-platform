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
  setChargeQuickpayMetadata,
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

test("Saving a Quickpay payment ID preserves other metadata and only updates the matching charge", async () => {
  const db = await client;

  const donation = await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 100,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.SmartFordeling, amount: 95 },
      { recipient: DonationRecipient.Malariamedicin, amount: 5 },
    ],
  });

  const charge = await insertCharge(db, {
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  const other = await insertCharge(db, {
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });
  await db.query("update charge set gateway_metadata = $1::jsonb where id = $2", [
    JSON.stringify({ quickpay_id: "old-id", quickpay_legacy: true }),
    charge.id,
  ]);

  await setChargeQuickpayMetadata(db, charge.short_id, 456);

  const charges = await findAllCharges(db);
  expect(charges.find(({ id }) => id === charge.id)?.gateway_metadata).toEqual({
    quickpay_id: "456",
    quickpay_legacy: true,
  });
  expect(charges.find(({ id }) => id === other.id)?.gateway_metadata).toEqual(other.gateway_metadata);
});

test("Insert initial charge for a donation via Quickpay only once", async () => {
  const db = await client;

  const donation = await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 100,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.SmartFordeling, amount: 95 },
      { recipient: DonationRecipient.Malariamedicin, amount: 5 },
    ],
  });

  const charge = await insertInitialChargeQuickpay(db, donation.gateway_metadata.quickpay_order);

  expect(charge).toMatchObject({
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });
  expect(await findAllCharges(db)).toMatchObject([{ id: charge.id, donation_id: donation.id, status: ChargeStatus.Created }]);

  expect(charge.short_id.substring(0, 2)).toEqual("c-");
  expect(charge.short_id).toHaveLength(6);

  expect(await findAllCharges(db)).toHaveLength(1);

  await insertInitialChargeQuickpay(db, donation.gateway_metadata.quickpay_order);

  expect(await findAllCharges(db)).toHaveLength(1);
});

test("Do not insert initial charge for a matching donation", async () => {
  const db = await client;

  const donation = await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 100,
    frequency: DonationFrequency.Match,
    method: PaymentMethod.CreditCard,
    taxDeductible: false,
    fundraiserId: "00000000-0000-0000-0000-000000000000",
    publicMessageAuthor: true,
    messageAuthor: "Jane",
    message: "Thanks!",
    earmarks: [
      { recipient: DonationRecipient.SmartFordeling, amount: 95 },
      { recipient: DonationRecipient.Malariamedicin, amount: 5 },
    ],
  });

  const charge = await insertInitialChargeQuickpay(db, donation.gateway_metadata.quickpay_order);

  expect(charge).toBeUndefined();
  expect(await findAllCharges(db)).toHaveLength(0);
});
