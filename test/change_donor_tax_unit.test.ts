import { setDate, subYears } from "date-fns";
import type { PoolClient } from "pg";
import {
  changeDonorTaxUnit,
  ChargeStatus,
  DonationFrequency,
  DonationRecipient,
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  GavebrevType,
  PaymentMethod,
  registerDonationViaQuickpay,
  registerGavebrev,
  registerMembershipViaQuickpay,
} from "src";
import { afterEach, beforeEach, expect, test } from "vitest";
import { utc } from "./helpers";
import {
  findAllCharges,
  findAllDonations,
  findAllDonors,
  findAllEarmarks,
  findAllGavebrevs,
  insertChargeWithCreatedAt,
} from "./repository";

const client = dbClient();

beforeEach(async () => {
  await dbBeginTransaction(await client);
});

afterEach(async () => {
  await dbRollbackTransaction(await client);
});

const baseEarmarks = [
  { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
  { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
];

const registerRecurringWithTin = async (
  db: PoolClient,
  email: string,
  tin: string,
) =>
  await registerDonationViaQuickpay(db, {
    email,
    amount: 100,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    taxDeductible: true,
    tin,
    earmarks: baseEarmarks,
  });

const registerOnceWithTin = async (
  db: PoolClient,
  email: string,
  tin: string,
) =>
  await registerDonationViaQuickpay(db, {
    email,
    amount: 50,
    frequency: DonationFrequency.Once,
    method: PaymentMethod.CreditCard,
    taxDeductible: true,
    tin,
    earmarks: baseEarmarks,
  });

const thisYear = (day: number) => utc(setDate(new Date(), day));

const lastYear = () => utc(subYears(new Date(), 1));

const twoYearsAgo = () => utc(subYears(new Date(), 2));

const nextMonth = () =>
  utc(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5));

test("Change donor tax unit: only name", async () => {
  const db = await client;

  const donation = await registerRecurringWithTin(
    db,
    "alice@example.com",
    "111111-1111",
  );
  const donorsBefore = await findAllDonors(db);
  expect(donorsBefore).toHaveLength(1);
  const originalId = donorsBefore[0].id;

  await insertChargeWithCreatedAt(db, {
    created_at: twoYearsAgo(),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });
  await insertChargeWithCreatedAt(db, {
    created_at: thisYear(5),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });

  const returned = await changeDonorTaxUnit(
    db,
    originalId,
    "Alice Updated",
    "111111-1111",
  );

  const donorsAfter = await findAllDonors(db);
  expect(donorsAfter).toHaveLength(1);
  expect(donorsAfter[0]).toMatchObject({
    id: returned?.id,
    name: "Alice Updated",
    tin: "111111-1111",
  });

  const donations = await findAllDonations(db);
  expect(donations).toHaveLength(1);
  expect(donations[0]).toMatchObject({ id: donation.id, cancelled: false });

  const charges = await findAllCharges(db);
  expect(charges).toHaveLength(2);
  expect(charges.every((c) => c.donation_id === donation.id)).toBe(true);
});

test("Change donor tax unit: empty donor", async () => {
  const db = await client;

  const emptyDonor = await db.query(
    `insert into donor (email, name, tin) values ($1, $2, $3) returning *`,
    ["bob@example.com", "Bob Original", "111111-1111"],
  );
  const donorId = emptyDonor.rows[0].id;

  const returned = await changeDonorTaxUnit(
    db,
    donorId,
    "Bob Updated",
    "999999-9999",
  );

  const donorsAfter = await findAllDonors(db);
  expect(donorsAfter).toHaveLength(1);
  expect(donorsAfter[0]).toMatchObject({
    id: returned?.id,
    name: "Bob Updated",
    tin: "999999-9999",
  });

  const donations = await findAllDonations(db);
  expect(donations).toHaveLength(0);
});

test("Change donor tax unit: empty donor, merge donor records", async () => {
  const db = await client;

  await db.query(
    `insert into donor (email, name, tin) values ($1, $2, $3) returning *`,
    ["bob@example.com", "Bob Existing", "999999-9999"],
  );

  const emptyDonor = await db.query(
    `insert into donor (email, name, tin) values ($1, $2, $3) returning *`,
    ["bob@example.com", "Bob Original", "111111-1111"],
  );
  const donorId = emptyDonor.rows[0].id;

  const returned = await changeDonorTaxUnit(
    db,
    donorId,
    "Bob Updated",
    "999999-9999",
  );

  const donorsAfter = await findAllDonors(db);
  expect(donorsAfter).toHaveLength(1);
  expect(donorsAfter[0]).toMatchObject({
    id: returned?.id,
    name: "Bob Updated",
    tin: "999999-9999",
  });

  const donations = await findAllDonations(db);
  expect(donations).toHaveLength(0);
});

test("Change donor tax unit: only donated this year", async () => {
  const db = await client;

  const donation = await registerRecurringWithTin(
    db,
    "carol@example.com",
    "111111-1111",
  );
  const donor = (await findAllDonors(db))[0];

  await insertChargeWithCreatedAt(db, {
    created_at: thisYear(5),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });
  await insertChargeWithCreatedAt(db, {
    created_at: nextMonth(),
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  const returned = await changeDonorTaxUnit(
    db,
    donor.id,
    "Carol Updated",
    "222222-2222",
  );

  const donorsAfter = await findAllDonors(db);
  expect(donorsAfter).toHaveLength(1);
  expect(donorsAfter[0]).toMatchObject({
    id: returned?.id,
    name: "Carol Updated",
    tin: "222222-2222",
  });

  const donations = await findAllDonations(db);
  expect(donations).toHaveLength(1);
  expect(donations[0]).toMatchObject({
    id: donation.id,
    donor_id: returned?.id,
    cancelled: false,
  });

  const charges = await findAllCharges(db);
  expect(charges).toHaveLength(2);
  expect(charges.every((c) => c.donation_id === donation.id)).toBe(true);
});

test("Change donor tax unit: only donated this year, merge donor rows", async () => {
  const db = await client;

  const targetDonor = await db.query(
    `insert into donor (email, name, tin) values ($1, $2, $3) returning *`,
    ["dave@example.com", "Dave Target", "222222-2222"],
  );
  const targetId = targetDonor.rows[0].id;

  const donation = await registerRecurringWithTin(
    db,
    "dave@example.com",
    "111111-1111",
  );

  const allDonors = await findAllDonors(db);
  const sourceDonor = allDonors.find((d) => d.id === donation.donor_id)!;

  await insertChargeWithCreatedAt(db, {
    created_at: thisYear(5),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });
  await insertChargeWithCreatedAt(db, {
    created_at: nextMonth(),
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  await changeDonorTaxUnit(db, sourceDonor.id, "Dave Updated", "222222-2222");

  const donorsAfter = await findAllDonors(db);
  expect(donorsAfter).toHaveLength(1);
  expect(donorsAfter.find((d) => d.id === sourceDonor.id)).toBeUndefined();
  expect(donorsAfter.find((d) => d.id === targetId)).toMatchObject({
    id: targetId,
    tin: "222222-2222",
  });

  const donations = await findAllDonations(db);
  expect(donations).toHaveLength(1);
  expect(donations[0]).toMatchObject({
    id: donation.id,
    donor_id: targetId,
    cancelled: false,
  });
});

test("Change donor tax unit: only donated this year, with gavebrev", async () => {
  const db = await client;

  await registerGavebrev(db, {
    name: "Dave Original",
    email: "dave@example.com",
    tin: "111111-1111",
    type: GavebrevType.Percentage,
    amount: 10,
    started_at: new Date("2023-01-01"),
    stopped_at: new Date("2028-12-31"),
  });
  const gavebrevsBefore = await findAllGavebrevs(db);
  expect(gavebrevsBefore).toHaveLength(1);

  const donation = await registerRecurringWithTin(
    db,
    "dave@example.com",
    "111111-1111",
  );
  const donor = (await findAllDonors(db))[0];

  await insertChargeWithCreatedAt(db, {
    created_at: thisYear(5),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });
  await insertChargeWithCreatedAt(db, {
    created_at: nextMonth(),
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  await changeDonorTaxUnit(db, donor.id, "Dave Updated", "222222-2222");

  const donorsAfter = await findAllDonors(db);
  expect(donorsAfter).toHaveLength(2);

  const oldDonor = donorsAfter.find((d) => d.id === donor.id)!;
  const newDonor = donorsAfter.find((d) => d.id !== donor.id)!;

  expect(oldDonor).toMatchObject({ tin: "111111-1111" });
  expect(newDonor).toMatchObject({ name: "Dave Updated", tin: "222222-2222" });

  const donations = await findAllDonations(db);
  expect(donations).toHaveLength(1);
  expect(donations[0]).toMatchObject({
    id: donation.id,
    donor_id: newDonor.id,
    cancelled: false,
  });

  const charges = await findAllCharges(db);
  expect(charges).toHaveLength(2);
  expect(charges.every((c) => c.donation_id === donation.id)).toBe(true);

  const gavebrevsAfter = await findAllGavebrevs(db);
  expect(gavebrevsAfter).toHaveLength(1);
  expect(gavebrevsAfter[0].donor_id).toBe(oldDonor.id);
});

test("Change donor tax unit: only donated this year, with gavebrev, merge donor rows", async () => {
  const db = await client;

  await db.query(
    `insert into donor (email, name, tin) values ($1, $2, $3) returning *`,
    ["dave@example.com", "Dave Existing", "222222-2222"],
  );

  await registerGavebrev(db, {
    name: "Dave Original",
    email: "dave@example.com",
    tin: "111111-1111",
    type: GavebrevType.Percentage,
    amount: 10,
    started_at: new Date("2023-01-01"),
    stopped_at: new Date("2028-12-31"),
  });
  const gavebrevsBefore = await findAllGavebrevs(db);
  expect(gavebrevsBefore).toHaveLength(1);

  const donation = await registerRecurringWithTin(
    db,
    "dave@example.com",
    "111111-1111",
  );

  await insertChargeWithCreatedAt(db, {
    created_at: thisYear(5),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });
  await insertChargeWithCreatedAt(db, {
    created_at: nextMonth(),
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  const donorsBefore = await findAllDonors(db);
  expect(donorsBefore).toHaveLength(2);

  await changeDonorTaxUnit(
    db,
    donation.donor_id,
    "Dave Updated",
    "222222-2222",
  );

  const donorsAfter = await findAllDonors(db);
  expect(donorsAfter).toHaveLength(2);

  const oldDonor = donorsAfter.find((d) => d.id === donation.donor_id)!;
  const newDonor = donorsAfter.find((d) => d.id !== donation.donor_id)!;

  expect(oldDonor).toMatchObject({ tin: "111111-1111" });
  expect(newDonor).toMatchObject({ name: "Dave Updated", tin: "222222-2222" });

  const donations = await findAllDonations(db);
  expect(donations).toHaveLength(1);
  expect(donations[0]).toMatchObject({
    id: donation.id,
    donor_id: newDonor.id,
    cancelled: false,
  });

  const charges = await findAllCharges(db);
  expect(charges).toHaveLength(2);
  expect(charges.every((c) => c.donation_id === donation.id)).toBe(true);

  const gavebrevsAfter = await findAllGavebrevs(db);
  expect(gavebrevsAfter).toHaveLength(1);
  expect(gavebrevsAfter[0].donor_id).toBe(oldDonor.id);
});

test("Change donor tax unit: one-time donation charged last year", async () => {
  const db = await client;

  await db.query(`insert into donor (email, name, tin) values ($1, $2, $3)`, [
    "eve@example.com",
    "Eve Original",
    "111111-1111",
  ]);
  const donor = (await findAllDonors(db))[0];

  const donation = await registerOnceWithTin(
    db,
    "eve@example.com",
    "111111-1111",
  );

  await insertChargeWithCreatedAt(db, {
    created_at: lastYear(),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });

  const returned = await changeDonorTaxUnit(
    db,
    donor.id,
    "Eve Updated",
    "222222-2222",
  );

  const donorsAfter = await findAllDonors(db);
  expect(donorsAfter).toHaveLength(1);
  expect(donorsAfter[0]).toMatchObject({
    name: "Eve Updated",
    tin: "111111-1111",
  });

  const donations = await findAllDonations(db);
  expect(donations).toHaveLength(1);
  expect(donations[0]).toMatchObject({
    id: donation.id,
    donor_id: returned?.id,
    cancelled: false,
  });
});

test("Change donor tax unit: cancelled old monthly donation", async () => {
  const db = await client;

  await db.query(`insert into donor (email, name, tin) values ($1, $2, $3)`, [
    "frank@example.com",
    "Frank Original",
    "111111-1111",
  ]);
  const donor = (await findAllDonors(db))[0];

  const donation = await registerRecurringWithTin(
    db,
    "frank@example.com",
    "111111-1111",
  );

  await insertChargeWithCreatedAt(db, {
    created_at: lastYear(),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });

  await db.query("update donation set cancelled = true where id = $1", [
    donation.id,
  ]);

  await changeDonorTaxUnit(db, donor.id, "Frank Updated", "222222-2222");

  const donations = await findAllDonations(db);
  expect(donations).toHaveLength(1);
  expect(donations[0]).toMatchObject({
    id: donation.id,
    donor_id: donor.id,
    cancelled: true,
  });

  const donorsAfter = await findAllDonors(db);
  expect(donorsAfter).toHaveLength(1);
  const oldDonor = donorsAfter.find((d) => d.id === donor.id)!;
  expect(oldDonor).toMatchObject({
    name: "Frank Updated",
    tin: "111111-1111",
  });
});

test("Change donor tax unit: cancelled old membership", async () => {
  const db = await client;

  await db.query(`insert into donor (email, name, tin) values ($1, $2, $3)`, [
    "frank2@example.com",
    "Frank2 Original",
    "111111-1111",
  ]);
  const donor = (await findAllDonors(db))[0];

  const donation = await registerMembershipViaQuickpay(db, {
    email: "frank2@example.com",
    tin: "111111-1111",
    name: "Frank2 Original",
    address: "Street 1",
    postcode: "1234",
    city: "City",
    country: "DK",
  });

  await insertChargeWithCreatedAt(db, {
    created_at: lastYear(),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });

  await db.query("update donation set cancelled = true where id = $1", [
    donation.id,
  ]);

  await changeDonorTaxUnit(db, donor.id, "Frank2 Updated", "222222-2222");

  const donations = await findAllDonations(db);
  expect(donations).toHaveLength(1);
  expect(donations[0]).toMatchObject({
    id: donation.id,
    donor_id: donor.id,
    cancelled: true,
  });

  const donorsAfter = await findAllDonors(db);
  expect(donorsAfter).toHaveLength(1);
  const oldDonor = donorsAfter.find((d) => d.id === donor.id)!;
  expect(oldDonor).toMatchObject({
    name: "Frank2 Updated",
    tin: "111111-1111",
  });
});

test("Change donor tax unit: old but recent monthly donation", async () => {
  const db = await client;

  const donation = await registerRecurringWithTin(
    db,
    "grace@example.com",
    "111111-1111",
  );
  const donor = (await findAllDonors(db))[0];

  const oldCharge = await insertChargeWithCreatedAt(db, {
    created_at: lastYear(),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });
  const currentCharge = await insertChargeWithCreatedAt(db, {
    created_at: thisYear(5),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });
  const futureCharge = await insertChargeWithCreatedAt(db, {
    created_at: nextMonth(),
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  await changeDonorTaxUnit(db, donor.id, "Grace Updated", "222222-2222");

  const donorsAfter = await findAllDonors(db);
  expect(donorsAfter).toHaveLength(2);

  const oldDonor = donorsAfter.find((d) => d.id === donor.id)!;
  const newDonor = donorsAfter.find((d) => d.id !== donor.id)!;

  expect(oldDonor).toMatchObject({ tin: "111111-1111" });
  expect(newDonor).toMatchObject({ name: "Grace Updated", tin: "222222-2222" });

  const donations = await findAllDonations(db);
  expect(donations).toHaveLength(2);

  const oldDonation = donations.find((d) => d.id === donation.id)!;
  const newDonation = donations.find((d) => d.id !== donation.id)!;

  expect(oldDonation).toMatchObject({
    donor_id: oldDonor.id,
    cancelled: true,
    amount: donation.amount,
    frequency: donation.frequency,
  });
  expect(newDonation).toMatchObject({
    donor_id: newDonor.id,
    cancelled: false,
    amount: donation.amount,
    frequency: donation.frequency,
    method: donation.method,
    tax_deductible: donation.tax_deductible,
    gateway_metadata: donation.gateway_metadata,
  });

  const charges = await findAllCharges(db);
  const byId = Object.fromEntries(charges.map((c) => [c.id, c]));

  expect(byId[oldCharge.id]).toMatchObject({ donation_id: oldDonation.id });
  expect(byId[currentCharge.id]).toMatchObject({ donation_id: newDonation.id });
  expect(byId[futureCharge.id]).toMatchObject({ donation_id: newDonation.id });

  const earmarks = await findAllEarmarks(db);
  const newEarmarks = earmarks.filter((e) => e.donation_id === newDonation.id);
  expect(newEarmarks).toHaveLength(2);
  expect(
    newEarmarks.map((e) => ({
      recipient: e.recipient,
      percentage: e.percentage,
    })),
  ).toEqual(
    expect.arrayContaining([
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ]),
  );

  const oldEarmarks = earmarks.filter((e) => e.donation_id === oldDonation.id);
  expect(oldEarmarks).toHaveLength(2);
});

test("Change donor tax unit: old but recent monthly donation, merge donor rows", async () => {
  const db = await client;

  const existingDonor = await db.query(
    `insert into donor (email, name, tin) values ($1, $2, $3) returning *`,
    ["henry@example.com", "Henry Existing", "222222-2222"],
  );
  const existingDonorId = existingDonor.rows[0].id;

  const donation = await registerRecurringWithTin(
    db,
    "henry@example.com",
    "111111-1111",
  );
  const allDonors = await findAllDonors(db);
  const sourceDonor = allDonors.find((d) => d.tin === "111111-1111")!;

  const oldCharge = await insertChargeWithCreatedAt(db, {
    created_at: lastYear(),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });
  const currentCharge = await insertChargeWithCreatedAt(db, {
    created_at: thisYear(5),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });
  const futureCharge = await insertChargeWithCreatedAt(db, {
    created_at: nextMonth(),
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  await changeDonorTaxUnit(db, sourceDonor.id, "Henry Updated", "222222-2222");

  const donorsAfter = await findAllDonors(db);
  expect(donorsAfter).toHaveLength(2);

  const oldDonor = donorsAfter.find((d) => d.id === sourceDonor.id)!;
  const newDonor = donorsAfter.find((d) => d.id === existingDonorId)!;

  expect(oldDonor).toMatchObject({ tin: "111111-1111" });
  expect(newDonor).toMatchObject({ tin: "222222-2222" });

  const donations = await findAllDonations(db);
  expect(donations).toHaveLength(2);

  const oldDonation = donations.find((d) => d.id === donation.id)!;
  const newDonation = donations.find((d) => d.id !== donation.id)!;

  expect(oldDonation).toMatchObject({
    donor_id: oldDonor.id,
    cancelled: true,
    amount: donation.amount,
    frequency: donation.frequency,
  });
  expect(newDonation).toMatchObject({
    donor_id: existingDonorId,
    cancelled: false,
    amount: donation.amount,
    frequency: donation.frequency,
    method: donation.method,
    tax_deductible: donation.tax_deductible,
    gateway_metadata: donation.gateway_metadata,
  });

  const charges = await findAllCharges(db);
  const byId = Object.fromEntries(charges.map((c) => [c.id, c]));

  expect(byId[oldCharge.id]).toMatchObject({ donation_id: oldDonation.id });
  expect(byId[currentCharge.id]).toMatchObject({ donation_id: newDonation.id });
  expect(byId[futureCharge.id]).toMatchObject({ donation_id: newDonation.id });

  const earmarks = await findAllEarmarks(db);
  const newEarmarks = earmarks.filter((e) => e.donation_id === newDonation.id);
  expect(newEarmarks).toHaveLength(2);
  expect(
    newEarmarks.map((e) => ({
      recipient: e.recipient,
      percentage: e.percentage,
    })),
  ).toEqual(
    expect.arrayContaining([
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ]),
  );

  const oldEarmarks = earmarks.filter((e) => e.donation_id === oldDonation.id);
  expect(oldEarmarks).toHaveLength(2);
});

test("Change donor tax unit: old but recent cancelled monthly donation, merge donor rows", async () => {
  const db = await client;

  const existingDonor = await db.query(
    `insert into donor (email, name, tin) values ($1, $2, $3) returning *`,
    ["henry@example.com", "Henry Existing", "222222-2222"],
  );
  const existingDonorId = existingDonor.rows[0].id;

  const donation = await registerRecurringWithTin(
    db,
    "henry@example.com",
    "111111-1111",
  );
  const allDonors = await findAllDonors(db);
  const sourceDonor = allDonors.find((d) => d.tin === "111111-1111")!;

  const oldCharge = await insertChargeWithCreatedAt(db, {
    created_at: lastYear(),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });
  const currentCharge = await insertChargeWithCreatedAt(db, {
    created_at: thisYear(5),
    donation_id: donation.id,
    status: ChargeStatus.Error,
  });
  const futureCharge = await insertChargeWithCreatedAt(db, {
    created_at: nextMonth(),
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  await db.query("update donation set cancelled = true where id = $1", [
    donation.id,
  ]);

  await changeDonorTaxUnit(db, sourceDonor.id, "Henry Updated", "222222-2222");

  const donorsAfter = await findAllDonors(db);
  expect(donorsAfter).toHaveLength(2);

  const oldDonor = donorsAfter.find((d) => d.id === sourceDonor.id)!;
  const newDonor = donorsAfter.find((d) => d.id === existingDonorId)!;

  expect(oldDonor).toMatchObject({ tin: "111111-1111" });
  expect(newDonor).toMatchObject({ tin: "222222-2222" });

  const donations = await findAllDonations(db);
  expect(donations).toHaveLength(2);

  const oldDonation = donations.find((d) => d.id === donation.id)!;
  const newDonation = donations.find((d) => d.id !== donation.id)!;

  expect(oldDonation).toMatchObject({
    donor_id: oldDonor.id,
    cancelled: true,
    amount: donation.amount,
    frequency: donation.frequency,
  });
  expect(newDonation).toMatchObject({
    donor_id: existingDonorId,
    cancelled: true,
    amount: donation.amount,
    frequency: donation.frequency,
    method: donation.method,
    tax_deductible: donation.tax_deductible,
    gateway_metadata: donation.gateway_metadata,
  });

  const charges = await findAllCharges(db);
  const byId = Object.fromEntries(charges.map((c) => [c.id, c]));

  expect(byId[oldCharge.id]).toMatchObject({ donation_id: oldDonation.id });
  expect(byId[currentCharge.id]).toMatchObject({ donation_id: newDonation.id });
  expect(byId[futureCharge.id]).toMatchObject({ donation_id: newDonation.id });

  const earmarks = await findAllEarmarks(db);
  const newEarmarks = earmarks.filter((e) => e.donation_id === newDonation.id);
  expect(newEarmarks).toHaveLength(2);
  expect(
    newEarmarks.map((e) => ({
      recipient: e.recipient,
      percentage: e.percentage,
    })),
  ).toEqual(
    expect.arrayContaining([
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ]),
  );

  const oldEarmarks = earmarks.filter((e) => e.donation_id === oldDonation.id);
  expect(oldEarmarks).toHaveLength(2);
});

test("Change donor tax unit: old but recent membership", async () => {
  const db = await client;

  const donation = await registerMembershipViaQuickpay(db, {
    email: "grace2@example.com",
    tin: "111111-1111",
    name: "Grace2 Original",
    address: "Street 1",
    postcode: "1234",
    city: "City",
    country: "DK",
  });
  const donor = (await findAllDonors(db))[0];

  const oldCharge = await insertChargeWithCreatedAt(db, {
    created_at: lastYear(),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });
  const currentCharge = await insertChargeWithCreatedAt(db, {
    created_at: thisYear(5),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });
  const futureCharge = await insertChargeWithCreatedAt(db, {
    created_at: nextMonth(),
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  await changeDonorTaxUnit(db, donor.id, "Grace2 Updated", "222222-2222");

  const donorsAfter = await findAllDonors(db);
  expect(donorsAfter).toHaveLength(1);
  expect(donorsAfter[0]).toMatchObject({
    id: donor.id,
    name: "Grace2 Updated",
    tin: "111111-1111",
  });

  const donations = await findAllDonations(db);
  expect(donations).toHaveLength(1);
  expect(donations[0]).toMatchObject({
    id: donation.id,
    donor_id: donor.id,
    cancelled: false,
  });

  const charges = await findAllCharges(db);
  const byId = Object.fromEntries(charges.map((c) => [c.id, c]));

  expect(byId[oldCharge.id]).toMatchObject({ donation_id: donation.id });
  expect(byId[currentCharge.id]).toMatchObject({ donation_id: donation.id });
  expect(byId[futureCharge.id]).toMatchObject({ donation_id: donation.id });

  const earmarks = await findAllEarmarks(db);
  const donationEarmarks = earmarks.filter(
    (e) => e.donation_id === donation.id,
  );
  expect(donationEarmarks).toHaveLength(1);
});

test("Change donor tax unit: old but recent membership, merge donor rows", async () => {
  const db = await client;

  const existingDonation = await registerRecurringWithTin(
    db,
    "henry2@example.com",
    "222222-2222",
  );
  const existingDonorId = existingDonation.donor_id;

  const donation = await registerMembershipViaQuickpay(db, {
    email: "henry2@example.com",
    tin: "111111-1111",
    name: "Henry2 Original",
    address: "Street 1",
    postcode: "1234",
    city: "City",
    country: "DK",
  });
  const allDonors = await findAllDonors(db);
  const sourceDonor = allDonors.find((d) => d.tin === "111111-1111")!;

  const oldCharge = await insertChargeWithCreatedAt(db, {
    created_at: lastYear(),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });
  const currentCharge = await insertChargeWithCreatedAt(db, {
    created_at: thisYear(5),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });
  const futureCharge = await insertChargeWithCreatedAt(db, {
    created_at: nextMonth(),
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  await changeDonorTaxUnit(db, sourceDonor.id, "Henry2 Updated", "222222-2222");

  const donorsAfter = await findAllDonors(db);
  expect(donorsAfter).toHaveLength(2);

  const oldDonor = donorsAfter.find((d) => d.id === sourceDonor.id)!;
  const newDonor = donorsAfter.find((d) => d.id === existingDonorId)!;

  expect(oldDonor).toMatchObject({ tin: "111111-1111" });
  expect(newDonor).toMatchObject({
    name: "Henry2 Updated",
    tin: "222222-2222",
  });

  const donations = await findAllDonations(db);
  expect(donations).toHaveLength(2);
  const oldDonation = donations.find((d) => d.id === existingDonation.id)!;
  const newDonation = donations.find((d) => d.id === donation.id)!;
  expect(oldDonation).toMatchObject({
    donor_id: existingDonorId,
    cancelled: false,
  });
  expect(newDonation).toMatchObject({
    donor_id: sourceDonor.id,
    cancelled: false,
  });

  const charges = await findAllCharges(db);
  const byId = Object.fromEntries(charges.map((c) => [c.id, c]));

  expect(byId[oldCharge.id]).toMatchObject({ donation_id: donation.id });
  expect(byId[currentCharge.id]).toMatchObject({ donation_id: donation.id });
  expect(byId[futureCharge.id]).toMatchObject({ donation_id: donation.id });

  const earmarks = await findAllEarmarks(db);
  const donationEarmarks = earmarks.filter(
    (e) => e.donation_id === donation.id,
  );
  expect(donationEarmarks).toHaveLength(1);
});

test("Change donor tax unit: old but recent cancelled membership, merge donor rows", async () => {
  const db = await client;

  const existingDonation = await registerRecurringWithTin(
    db,
    "henry2@example.com",
    "222222-2222",
  );
  const existingDonorId = existingDonation.donor_id;

  await db.query("update donation set cancelled = true where id = $1", [
    existingDonation.id,
  ]);

  const donation = await registerMembershipViaQuickpay(db, {
    email: "henry2@example.com",
    tin: "111111-1111",
    name: "Henry2 Original",
    address: "Street 1",
    postcode: "1234",
    city: "City",
    country: "DK",
  });
  const allDonors = await findAllDonors(db);
  const sourceDonor = allDonors.find((d) => d.tin === "111111-1111")!;

  const oldCharge = await insertChargeWithCreatedAt(db, {
    created_at: lastYear(),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });
  const currentCharge = await insertChargeWithCreatedAt(db, {
    created_at: thisYear(5),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });
  const futureCharge = await insertChargeWithCreatedAt(db, {
    created_at: nextMonth(),
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  await db.query("update donation set cancelled = true where id = $1", [
    donation.id,
  ]);

  await changeDonorTaxUnit(db, sourceDonor.id, "Henry2 Updated", "222222-2222");

  const donorsAfter = await findAllDonors(db);
  expect(donorsAfter).toHaveLength(2);

  const oldDonor = donorsAfter.find((d) => d.id === sourceDonor.id)!;
  const newDonor = donorsAfter.find((d) => d.id === existingDonorId)!;

  expect(oldDonor).toMatchObject({ tin: "111111-1111" });
  expect(newDonor).toMatchObject({
    name: "Henry2 Updated",
    tin: "222222-2222",
  });

  const donations = await findAllDonations(db);
  expect(donations).toHaveLength(2);
  const oldDonation = donations.find((d) => d.id === existingDonation.id)!;
  const newDonation = donations.find((d) => d.id === donation.id)!;
  expect(oldDonation).toMatchObject({
    donor_id: existingDonorId,
    cancelled: true,
  });
  expect(newDonation).toMatchObject({
    donor_id: sourceDonor.id,
    cancelled: true,
  });

  const charges = await findAllCharges(db);
  const byId = Object.fromEntries(charges.map((c) => [c.id, c]));

  expect(byId[oldCharge.id]).toMatchObject({ donation_id: donation.id });
  expect(byId[currentCharge.id]).toMatchObject({ donation_id: donation.id });
  expect(byId[futureCharge.id]).toMatchObject({ donation_id: donation.id });

  const earmarks = await findAllEarmarks(db);
  const donationEarmarks = earmarks.filter(
    (e) => e.donation_id === donation.id,
  );
  expect(donationEarmarks).toHaveLength(1);
});
