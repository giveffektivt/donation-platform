import { dbBeginTransaction, dbClient, dbRollbackTransaction, getDonationsByEmail } from "src";
import { afterEach, beforeEach, expect, test } from "vitest";

const client = dbClient();

beforeEach(async () => {
  await dbBeginTransaction(await client);
});

afterEach(async () => {
  await dbRollbackTransaction(await client);
});

test("Custom transfer recipients are not donation choices", async () => {
  const db = await client;
  for (const [recipient, unit] of [
    ["TaRL Africa", "Børn med målrettet undervisning"],
    ["Evidence Action", null],
    ["Taimaka", "Børn behandlet for akut underernæring"],
    ["Lafiya", "Par-år med præventionsbeskyttelse"],
  ]) {
    const result = await db.query("insert into transfer (recipient, earmark) values ($1, 'andet') returning recipient, unit", [recipient]);
    expect(result.rows[0]).toEqual({ recipient, unit });
  }
  const result = await db.query("select unnest(enum_range(null::donation_recipient))::text as recipient");
  const choices = result.rows.map((row) => row.recipient);
  for (const recipient of ["TaRL Africa", "Evidence Action", "Taimaka", "Lafiya"]) {
    expect(choices).not.toContain(recipient);
  }
});

test("Existing transfers keep their default units and allow overrides", async () => {
  const db = await client;
  const result = await db.query(
    `insert into transfer (recipient, earmark, unit) values
      ('Helen Keller International', 'a-vitamin', null),
      ('Helen Keller International', 'a-vitamin', 'Børn nået')
    returning unit`,
  );
  expect(result.rows.map((row) => row.unit)).toEqual(["A-vitamintilskud", "Børn nået"]);
});

test("Different units for Evidence Action remain separate in reports and donor impact", async () => {
  const db = await client;
  const units = ["Børn nået med ormekur eller jerntilskud", "Personer med adgang til rent vand i ét år"];
  for (const unit of units) {
    const donation = await db.query(
      `select id from register_donation(
        p_amount => 100,
        p_frequency => 'once',
        p_gateway => 'Bank transfer',
        p_method => 'Bank transfer',
        p_tax_deductible => false,
        p_earmarks => '[{"recipient":"andet","amount":100}]',
        p_email => 'custom-transfer@example.com'
      )`,
    );
    const donationId = donation.rows[0].id;
    const charge = await db.query(
      `insert into charge (donation_id, status, created_at)
       values ($1, 'charged', date_trunc('year', now() - interval '9 months') + interval '1 day')
       returning id`,
      [donationId],
    );
    const transfer = await db.query(
      `insert into transfer (recipient, earmark, unit, exchange_rate, unit_cost_external, unit_cost_conversion)
       values ('Evidence Action', 'andet', $1, 10, 2, 1) returning id`,
      [unit],
    );
    await db.query(
      `insert into charge_transfer (charge_id, transfer_id, donation_id, earmark)
       values ($1, $2, $3, 'andet')`,
      [charge.rows[0].id, transfer.rows[0].id, donationId],
    );
  }
  const report = await db.query(
    "select unit_label, unit_total, amount_total from annual_email_report where email = 'custom-transfer@example.com' order by unit_label",
  );
  expect(report.rows).toEqual([...units].sort().map((unit) => ({ unit_label: unit, unit_total: 5, amount_total: 100 })));
  const overview = await db.query("select unit, unit_impact from transfer_overview where recipient = 'Evidence Action' order by unit");
  expect(overview.rows).toEqual([...units].sort().map((unit) => ({ unit, unit_impact: 5 })));
  const donations = await getDonationsByEmail(db, "custom-transfer@example.com");
  expect(
    donations
      .flatMap((donation) => donation.impact)
      .map((impact) => impact.unit)
      .sort(),
  ).toEqual([...units].sort());
});

test("Pending Andet donations are not automatically assigned to future custom transfers", async () => {
  const db = await client;
  const donation = await db.query(
    `select id from register_donation(
      p_amount => 100,
      p_frequency => 'once',
      p_gateway => 'Bank transfer',
      p_method => 'Bank transfer',
      p_tax_deductible => false,
      p_earmarks => '[{"recipient":"andet","amount":100}]',
      p_email => 'pending-custom-transfer@example.com'
    )`,
  );
  await db.query("insert into charge (donation_id, status) values ($1, 'charged')", [donation.rows[0].id]);
  const transfer = await db.query(
    `insert into transfer (recipient, earmark, unit, created_at)
     values ('Evidence Action', 'andet', 'Børn nået', now() + interval '1 month') returning id`,
  );
  const overview = await db.query("select * from transfer_overview where id = $1", [transfer.rows[0].id]);
  expect(overview.rows).toEqual([]);
  const donations = await getDonationsByEmail(db, "pending-custom-transfer@example.com");
  expect(donations[0].impact).toEqual([]);
});

test("Blank transfer units are rejected", async () => {
  await expect((await client).query("insert into transfer (recipient, earmark, unit) values ('Evidence Action', 'andet', '   ')")).rejects.toThrow(
    "transfer_unit_not_blank",
  );
});
