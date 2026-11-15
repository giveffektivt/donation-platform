import { readFile } from "node:fs/promises";
import {
  changeDonation,
  ChargeStatus,
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  DonationFrequency,
  DonationRecipient,
  getFailedRecurringDonations,
  insertCharge,
  PaymentMethod,
  quickpayHandleChange,
  recreateFailedRecurringDonation,
  registerDonationViaQuickpay,
  setChargeStatus,
  setDonationQuickpayId,
} from "src";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const client = dbClient();
let subscriptionId = 1000;

beforeEach(async () => {
  await dbBeginTransaction(await client);
});

afterEach(async () => {
  await dbRollbackTransaction(await client);
  vi.unstubAllEnvs();
});

async function register(method = PaymentMethod.CreditCard) {
  const db = await client;
  const donation = await registerDonationViaQuickpay(db, {
    email: "subscription@example.com",
    amount: 100,
    frequency: DonationFrequency.Monthly,
    method,
    taxDeductible: false,
    earmarks: [{ recipient: DonationRecipient.SmartFordeling, amount: 100 }],
  });
  donation.gateway_metadata.quickpay_id = String(++subscriptionId);
  await setDonationQuickpayId(db, donation);
  return donation;
}

async function confirmation(id: string) {
  return (await (await client).query(
    "select subscription_confirmed_at from donation where id = $1",
    [id],
  )).rows[0].subscription_confirmed_at;
}

async function fail(id: string) {
  const db = await client;
  await db.query("update charge set status = 'error' where donation_id = $1", [id]);
  await insertCharge(db, { donation_id: id, status: ChargeStatus.Error });
}

test("abandoned setup and an unconfirmed first failure do not qualify for recovery", async () => {
  const donation = await register();
  expect(await confirmation(donation.id)).toBeNull();
  await fail(donation.id);
  expect(await getFailedRecurringDonations(await client)).toEqual([]);
});

test.each([PaymentMethod.CreditCard, PaymentMethod.MobilePay])(
  "%s subscription authorization qualifies a first collection failure for recovery",
  async (method) => {
    vi.stubEnv("VERCEL_ENV", "development");
    const db = await client;
    const donation = await register(method);
    const change = {
      id: Number(donation.gateway_metadata.quickpay_id),
      order_id: donation.gateway_metadata.quickpay_order,
      type: "Subscription",
      state: "active",
      accepted: true,
      acquirer: method === PaymentMethod.MobilePay ? "vmpepayment" : "clearhaus",
      test_mode: false,
      operations: [],
    };
    await quickpayHandleChange(db, { ...change, accepted: false });
    expect(await confirmation(donation.id)).toBeNull();
    await quickpayHandleChange(db, { ...change, state: "pending" });
    expect(await confirmation(donation.id)).toBeNull();
    await quickpayHandleChange(db, { ...change, id: 456 });
    expect(await confirmation(donation.id)).toBeNull();
    await quickpayHandleChange(db, change);
    const confirmedAt = await confirmation(donation.id);
    expect(confirmedAt).toBeInstanceOf(Date);
    await quickpayHandleChange(db, change);
    expect(await confirmation(donation.id)).toEqual(confirmedAt);
    await fail(donation.id);
    expect(await getFailedRecurringDonations(db)).toMatchObject([{ donation_id: donation.id }]);
  },
);

test("production test subscriptions are not confirmed", async () => {
  vi.stubEnv("VERCEL_ENV", "production");
  const donation = await register();
  const db = await client;
  await quickpayHandleChange(db, {
    id: Number(donation.gateway_metadata.quickpay_id),
    order_id: donation.gateway_metadata.quickpay_order,
    type: "Subscription",
    state: "active",
    accepted: true,
    acquirer: "clearhaus",
    test_mode: true,
    operations: [],
  });
  expect(await confirmation(donation.id)).toBeNull();
});

test("successful captures confirm subscriptions on insert and status update", async () => {
  const db = await client;
  const donation = await register();
  await insertCharge(db, { donation_id: donation.id, status: ChargeStatus.Charged });
  expect(await confirmation(donation.id)).toBeInstanceOf(Date);
  const another = await register();
  const charge = await insertCharge(db, { donation_id: another.id, status: ChargeStatus.Waiting });
  expect(await confirmation(another.id)).toBeNull();
  await setChargeStatus(db, { id: charge.id, status: ChargeStatus.Charged });
  expect(await confirmation(another.id)).toBeInstanceOf(Date);
});

test("amount, earmark and tax-unit changes preserve confirmation across versions", async () => {
  const db = await client;
  const original = await register();
  await insertCharge(db, { donation_id: original.id, status: ChargeStatus.Charged });
  const confirmedAt = await confirmation(original.id);
  const amountChanged = await changeDonation(db, original.id, 200, null, null);
  expect(amountChanged.subscription_confirmed_at).toEqual(confirmedAt);
  const earmarksChanged = await changeDonation(db, amountChanged.id, null, [
    { recipient: DonationRecipient.Malariamedicin, amount: 200 },
  ], null);
  expect(earmarksChanged.subscription_confirmed_at).toEqual(confirmedAt);
  const taxUnitChanged = await changeDonation(db, earmarksChanged.id, null, null, "111111-1111");
  expect(taxUnitChanged.subscription_confirmed_at).toEqual(confirmedAt);
  await fail(taxUnitChanged.id);
  expect(await getFailedRecurringDonations(db)).toMatchObject([{ donation_id: taxUnitChanged.id }]);
});

test("changing an unconfirmed donation does not confirm it", async () => {
  const donation = await register();
  const changed = await changeDonation(await client, donation.id, 200, null, null);
  expect(changed.subscription_confirmed_at).toBeNull();
  await fail(changed.id);
  expect(await getFailedRecurringDonations(await client)).toEqual([]);
});

test("copying a donation preserves confirmation only when retaining the payment setup", async () => {
  const db = await client;
  const original = await register();
  await insertCharge(db, { donation_id: original.id, status: ChargeStatus.Charged });
  const sameSubscription = (await db.query("select * from copy_donation($1)", [original.id])).rows[0];
  expect(sameSubscription.subscription_confirmed_at).toEqual(await confirmation(original.id));
  const newSubscription = (await db.query(
    "select * from copy_donation(p_donation_id => $1, p_gateway_metadata => $2::jsonb)",
    [original.id, JSON.stringify({ ...original.gateway_metadata, quickpay_id: "99999" })],
  )).rows[0];
  expect(newSubscription.subscription_confirmed_at).toBeNull();
});

test("a fresh renewal subscription does not inherit confirmation", async () => {
  const db = await client;
  const donation = await register();
  await insertCharge(db, { donation_id: donation.id, status: ChargeStatus.Charged });
  const renewed = await recreateFailedRecurringDonation(db, donation.id);
  expect(renewed.subscription_confirmed_at).toBeNull();
});

test("capture backfill preserves old recovery eligibility without sharing subscription history", async () => {
  const db = await client;
  const paid = await register();
  await insertCharge(db, { donation_id: paid.id, status: ChargeStatus.Charged });
  await db.query("update charge set created_at = now() - interval '1 month' where donation_id = $1", [paid.id]);
  const changed = await changeDonation(db, paid.id, 200, null, null);
  await fail(changed.id);
  const eligible = await register();
  await insertCharge(db, { donation_id: eligible.id, status: ChargeStatus.Charged });
  await db.query("update charge set created_at = now() - interval '1 month' where donation_id = $1", [eligible.id]);
  await insertCharge(db, { donation_id: eligible.id, status: ChargeStatus.Error });
  const unconfirmed = await register();
  await fail(unconfirmed.id);
  const expected = (await db.query(`
    select d.id from donation d
    join lateral (
      select status from charge where donation_id = d.id order by created_at desc limit 1
    ) latest on latest.status = 'error'
    where d.gateway in ('Quickpay', 'Scanpay') and not d.cancelled
      and d.frequency in ('monthly', 'yearly')
      and exists (select 1 from charge c where c.donation_id = d.id and c.status = 'charged')
    order by d.id
  `)).rows.map((row) => row.id);
  await db.query("update donation set subscription_confirmed_at = null");
  const migration = await readFile(new URL("../db/migrations/20261115101104_add-subscription-confirmed-at.sql", import.meta.url), "utf8");
  const backfill = migration.slice(migration.indexOf("update donation d"), migration.indexOf("create function"));
  await db.query(backfill);
  expect((await getFailedRecurringDonations(db)).map((row) => row.donation_id).sort()).toEqual(expected);
  expect(await confirmation(paid.id)).toBeInstanceOf(Date);
  expect(await confirmation(changed.id)).toBeNull();
  expect(await confirmation(unconfirmed.id)).toBeNull();
});
