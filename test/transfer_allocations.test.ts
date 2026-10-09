import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import type { PoolClient } from "pg";
import { dbBeginTransaction, dbClient, dbRelease, dbRollbackTransaction, getAggregatedDonationsByEmail, getDonationsByEmail } from "src";
import { afterEach, beforeEach, expect, test } from "vitest";

const client = dbClient();

beforeEach(async () => {
  await dbBeginTransaction(await client);
});

afterEach(async () => {
  await dbRollbackTransaction(await client);
});

async function createFixture(db: PoolClient, amount = 1000) {
  const email = `allocation-${randomUUID()}@example.com`;
  const donation = await db.query(
    `select id, donor_id from register_donation(
      p_amount => $1,
      p_frequency => 'monthly',
      p_gateway => 'Bank transfer',
      p_method => 'Bank transfer',
      p_tax_deductible => false,
      p_earmarks => $2::jsonb,
      p_email => $3
    )`,
    [amount, JSON.stringify([{ recipient: "andet", amount }]), email],
  );
  const donationId = donation.rows[0].id;
  const charge = await db.query(
    `insert into charge (donation_id, status, created_at)
     values ($1, 'charged', date_trunc('year', now() - interval '9 months') + interval '1 day') returning id`,
    [donationId],
  );
  const transfers = await db.query(
    `insert into transfer (recipient, earmark, unit, exchange_rate, unit_cost_external, unit_cost_conversion)
     values
       ('Evidence Action', 'andet', 'Børn nået med ormekur eller jerntilskud', 10, 2, 1),
       ('Evidence Action', 'andet', 'Personer med adgang til rent vand i ét år', 10, 4, 1),
       ('Taimaka', 'andet', null, 10, 5, 1)
     returning id, unit`,
  );
  return {
    email,
    donationId,
    donorId: donation.rows[0].donor_id,
    chargeId: charge.rows[0].id,
    transferIds: transfers.rows.map((row) => row.id) as string[],
    units: transfers.rows.map((row) => row.unit) as string[],
  };
}

type Fixture = Awaited<ReturnType<typeof createFixture>>;

async function allocate(db: PoolClient, fixture: Fixture, transferIndex: number, amount: number | string) {
  await db.query(
    `insert into charge_transfer (charge_id, transfer_id, donation_id, earmark, amount)
     values ($1, $2, $3, 'andet', $4)`,
    [fixture.chargeId, fixture.transferIds[transferIndex], fixture.donationId, amount],
  );
}

async function expectRejected(db: PoolClient, operation: () => Promise<unknown>, message: string) {
  await db.query("savepoint invalid_allocation");
  try {
    await expect(operation()).rejects.toThrow(message);
  } finally {
    await db.query("rollback to savepoint invalid_allocation");
    await db.query("release savepoint invalid_allocation");
  }
}

test("One charged earmark can fund multiple programs and recipients without double counting", async () => {
  const db = await client;
  const fixture = await createFixture(db);
  await allocate(db, fixture, 0, 600);
  await allocate(db, fixture, 1, 300);
  await allocate(db, fixture, 2, 100);
  await db.query("set constraints all immediate");

  for (const view of ["charged_donations_by_transfer_internal", "charged_donations_by_transfer"]) {
    const result = await db.query(`select amount, transfer_id from ${view} where charge_id = $1 order by amount desc`, [fixture.chargeId]);
    expect(result.rows).toEqual([600, 300, 100].map((amount, i) => ({ amount, transfer_id: fixture.transferIds[i] })));
  }
  const report = await db.query("select unit_label, amount_total, unit_total from annual_email_report where email = $1 order by amount_total desc", [
    fixture.email,
  ]);
  expect(report.rows).toEqual([
    { unit_label: fixture.units[0], amount_total: 600, unit_total: 30 },
    { unit_label: fixture.units[1], amount_total: 300, unit_total: 7.5 },
    { unit_label: fixture.units[2], amount_total: 100, unit_total: 2 },
  ]);
  const overview = await db.query("select id, total_dkk, unit_impact from transfer_overview where id = any($1::uuid[]) order by total_dkk desc", [
    fixture.transferIds,
  ]);
  expect(overview.rows).toEqual([
    { id: fixture.transferIds[0], total_dkk: 600, unit_impact: 30 },
    { id: fixture.transferIds[1], total_dkk: 300, unit_impact: 7.5 },
    { id: fixture.transferIds[2], total_dkk: 100, unit_impact: 2 },
  ]);
  const donorReport = await db.query("select amount, units, unit_label from donor_impact_report where email = $1 order by amount desc", [
    fixture.email,
  ]);
  expect(donorReport.rows).toEqual([
    { amount: 600, units: 30, unit_label: fixture.units[0] },
    { amount: 300, units: 7.5, unit_label: fixture.units[1] },
    { amount: 100, units: 2, unit_label: fixture.units[2] },
  ]);
  const donations = await getDonationsByEmail(db, fixture.email);
  expect(donations[0].amount).toBe(1000);
  expect(donations[0].impact.map((impact) => ({ amount: impact.amount, count: impact.count })).sort((a, b) => b.amount - a.amount)).toEqual([
    { amount: 600, count: 30 },
    { amount: 300, count: 7.5 },
    { amount: 100, count: 2 },
  ]);
  const aggregated = await getAggregatedDonationsByEmail(db, fixture.email);
  expect(aggregated.find((row) => row.earmark === "Evidence Action").total).toBe(900);
  expect(aggregated.find((row) => row.earmark === "Taimaka").total).toBe(100);
});

test("Partial allocations leave exactly their unallocated balance pending", async () => {
  const db = await client;
  const fixture = await createFixture(db);
  await allocate(db, fixture, 0, 600);
  await db.query("set constraints all immediate");
  const allocations = await db.query(
    "select amount, transfer_id from charged_donations_by_transfer_internal where charge_id = $1 order by amount desc",
    [fixture.chargeId],
  );
  expect(allocations.rows).toEqual([
    { amount: 600, transfer_id: fixture.transferIds[0] },
    { amount: 400, transfer_id: null },
  ]);
  const pending = await db.query("select amount from transfer_pending where earmark = 'andet'");
  expect(pending.rows).toEqual([{ amount: 400 }]);
  const distribution = await db.query("select dkk_total, payments_total from pending_distribution where earmark = 'andet'");
  expect(distribution.rows).toEqual([{ dkk_total: 400, payments_total: 1 }]);
  const impact = (await getDonationsByEmail(db, fixture.email))[0].impact;
  expect(impact.map((row) => row.amount)).toEqual([600]);
  const annual = await db.query("select sum(amount_total) as total from annual_email_report where email = $1", [fixture.email]);
  expect(annual.rows[0].total).toBe(1000);
});

test("Allocations retain monetary precision without rounding each portion", async () => {
  const db = await client;
  const fixture = await createFixture(db, 1);
  await allocate(db, fixture, 0, 0.33);
  await allocate(db, fixture, 1, 0.33);
  await db.query("set constraints all immediate");
  const result = await db.query("select amount from charged_donations_by_transfer_internal where charge_id = $1 order by amount", [fixture.chargeId]);
  expect(result.rows).toEqual([{ amount: 0.33 }, { amount: 0.33 }, { amount: 0.34 }]);
  const donations = await getDonationsByEmail(db, fixture.email);
  expect(donations[0].impact.map((row) => row.amount)).toEqual([0.33, 0.33]);
});

test("Omitting an allocation amount retains legacy full-earmark behavior", async () => {
  const db = await client;
  const fixture = await createFixture(db);
  const result = await db.query(
    `insert into charge_transfer (charge_id, transfer_id, donation_id, earmark)
     values ($1, $2, $3, 'andet') returning amount`,
    [fixture.chargeId, fixture.transferIds[0], fixture.donationId],
  );
  expect(result.rows[0].amount).toBe(1000);
  await db.query("set constraints all immediate");
  await expectRejected(db, () => allocate(db, fixture, 1, 1), "exceed earmark amount");
});

test("Invalid amounts, duplicate links and mismatched earmarks are rejected", async () => {
  const db = await client;
  const fixture = await createFixture(db);
  await db.query("set constraints all immediate");
  for (const amount of [0, -1, "NaN", "Infinity", "-Infinity"]) {
    await expectRejected(db, () => allocate(db, fixture, 0, amount), "charge_transfer_amount_positive_finite");
  }
  await allocate(db, fixture, 0, 600);
  await expectRejected(db, () => allocate(db, fixture, 0, 100), "charge_transfer_pkey");
  await expectRejected(db, () => allocate(db, fixture, 1, 401), "exceed earmark amount");
  await expectRejected(db, () => db.query("update charge_transfer set amount = null where charge_id = $1", [fixture.chargeId]), "null value");
  const other = await db.query("insert into transfer (recipient, earmark) values ('Helen Keller International', 'a-vitamin') returning id");
  await expectRejected(
    db,
    () => db.query("update charge_transfer set transfer_id = $1 where charge_id = $2", [other.rows[0].id, fixture.chargeId]),
    "charge_transfer_transfer_id_earmark_fkey",
  );
});

test("Deferred validation allows atomic rebalancing but rejects invalid final totals", async () => {
  const db = await client;
  const fixture = await createFixture(db);
  await allocate(db, fixture, 0, 600);
  await allocate(db, fixture, 1, 400);
  await db.query("update charge_transfer set amount = 700 where charge_id = $1 and transfer_id = $2", [fixture.chargeId, fixture.transferIds[0]]);
  await db.query("update charge_transfer set amount = 300 where charge_id = $1 and transfer_id = $2", [fixture.chargeId, fixture.transferIds[1]]);
  await db.query("set constraints all immediate");
  await db.query("set constraints all deferred");
  await expectRejected(
    db,
    async () => {
      await db.query("update charge_transfer set amount = 301 where charge_id = $1 and transfer_id = $2", [fixture.chargeId, fixture.transferIds[1]]);
      await db.query("set constraints all immediate");
    },
    "exceed earmark amount",
  );
});

test("Deleting an allocation restores its pending balance", async () => {
  const db = await client;
  const fixture = await createFixture(db);
  await allocate(db, fixture, 0, 600);
  await allocate(db, fixture, 1, 400);
  await db.query("delete from charge_transfer where charge_id = $1 and transfer_id = $2", [fixture.chargeId, fixture.transferIds[1]]);
  await db.query("set constraints all immediate");
  const result = await db.query("select amount from charged_donations_by_transfer_internal where charge_id = $1 and transfer_id is null", [
    fixture.chargeId,
  ]);
  expect(result.rows).toEqual([{ amount: 400 }]);
});

test("Reducing an earmark cannot invalidate existing allocations", async () => {
  const db = await client;
  const fixture = await createFixture(db);
  await allocate(db, fixture, 0, 600);
  await expectRejected(
    db,
    async () => {
      await db.query("update donation set amount = 500 where id = $1", [fixture.donationId]);
      await db.query("update earmark set amount = 500 where donation_id = $1", [fixture.donationId]);
      await db.query("set constraints all immediate");
    },
    "exceed earmark amount",
  );
});

test("Recurring charges each have their own allocation budget", async () => {
  const db = await client;
  const fixture = await createFixture(db);
  await allocate(db, fixture, 0, 1000);
  const second = await db.query("insert into charge (donation_id, status) values ($1, 'charged') returning id", [fixture.donationId]);
  await allocate(db, { ...fixture, chargeId: second.rows[0].id }, 1, 1000);
  await db.query("set constraints all immediate");
  const result = await db.query("select sum(amount) as total from charged_donations_by_transfer_internal where donation_id = $1", [
    fixture.donationId,
  ]);
  expect(result.rows[0].total).toBe(2000);
});

test("Allocation limits apply independently to each earmark", async () => {
  const db = await client;
  const fixture = await createFixture(db);
  await db.query("update earmark set amount = 700 where donation_id = $1", [fixture.donationId]);
  await db.query("insert into earmark (donation_id, recipient, amount) values ($1, 'a-vitamin', 300)", [fixture.donationId]);
  const transfer = await db.query("insert into transfer (recipient, earmark) values ('Helen Keller International', 'a-vitamin') returning id");
  await allocate(db, fixture, 0, 700);
  await db.query("insert into charge_transfer (charge_id, transfer_id, donation_id, earmark, amount) values ($1, $2, $3, 'a-vitamin', 300)", [
    fixture.chargeId,
    transfer.rows[0].id,
    fixture.donationId,
  ]);
  await db.query("set constraints all immediate");
  await expectRejected(db, () => allocate(db, fixture, 1, 1), "exceed earmark amount 700");
  const result = await db.query("select sum(amount) as total from charged_donations_by_transfer_internal where charge_id = $1", [fixture.chargeId]);
  expect(result.rows[0].total).toBe(1000);
});

test("Moving an allocation to another charge revalidates its destination budget", async () => {
  const db = await client;
  const fixture = await createFixture(db);
  const second = await db.query("insert into charge (donation_id, status) values ($1, 'charged') returning id", [fixture.donationId]);
  await allocate(db, fixture, 0, 600);
  await allocate(db, { ...fixture, chargeId: second.rows[0].id }, 1, 600);
  await db.query("set constraints all immediate");
  await expectRejected(
    db,
    () => db.query("update charge_transfer set charge_id = $1 where charge_id = $2", [second.rows[0].id, fixture.chargeId]),
    "exceed earmark amount",
  );
});

test("Payment counts do not count one charge twice for the same organization", async () => {
  const db = await client;
  const fixture = await createFixture(db);
  await allocate(db, fixture, 0, 600);
  await allocate(db, fixture, 1, 400);
  const result = await db.query("select dkk_total, payments_total from transferred_distribution where recipient = 'Evidence Action'");
  expect(result.rows).toEqual([{ dkk_total: 1000, payments_total: 1 }]);
});

for (const isolation of ["read committed", "repeatable read", "serializable"]) {
  test(`Concurrent allocations cannot exceed the budget under ${isolation}`, async () => {
    const db = await client;
    const fixture = await createFixture(db);
    await db.query("commit");
    const second = await dbClient();
    const observer = await dbClient();
    try {
      await db.query(`begin isolation level ${isolation}`);
      await second.query(`begin isolation level ${isolation}`);
      await second.query("set local statement_timeout = '10s'");
      await second.query("select count(*) from charge_transfer where charge_id = $1", [fixture.chargeId]);
      const pid = (await second.query("select pg_backend_pid() as pid")).rows[0].pid;
      await allocate(db, fixture, 0, 600);
      const competing = (async () => {
        try {
          await allocate(second, fixture, 1, 600);
          await second.query("commit");
          return null;
        } catch (error) {
          return (error as { code: string }).code;
        }
      })();
      let blocked = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        blocked = (await observer.query("select cardinality(pg_blocking_pids($1)) > 0 as blocked", [pid])).rows[0].blocked;
        if (blocked) break;
        await setTimeout(20);
      }
      expect(blocked).toBe(true);
      await db.query("commit");
      expect(await competing).toBe(isolation === "read committed" ? "23514" : "40001");
      const result = await observer.query("select sum(amount) as total from charge_transfer where charge_id = $1", [fixture.chargeId]);
      expect(result.rows[0].total).toBe(600);
    } finally {
      await db.query("rollback");
      await second.query("rollback");
      dbRelease(second);
      dbRelease(observer);
      await db.query("begin");
      await db.query("delete from charge_transfer where donation_id = $1", [fixture.donationId]);
      await db.query("delete from charge where donation_id = $1", [fixture.donationId]);
      await db.query("delete from earmark where donation_id = $1", [fixture.donationId]);
      await db.query("delete from donation where id = $1", [fixture.donationId]);
      await db.query("delete from donor where id = $1", [fixture.donorId]);
      await db.query("delete from transfer where id = any($1::uuid[])", [fixture.transferIds]);
      await db.query("commit");
      await db.query("begin");
    }
  }, 15000);
}
