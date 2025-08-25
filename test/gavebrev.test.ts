import {
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  GavebrevStatus,
  GavebrevType,
  insertGavebrevData,
} from "src";
import { afterEach, beforeEach, expect, test } from "vitest";
import {
  findAllCharges,
  findAllDonations,
  findAllDonors,
  findAllGavebrevs,
} from "./repository";

const client = dbClient();

beforeEach(async () => {
  await dbBeginTransaction(await client);
});

afterEach(async () => {
  await dbRollbackTransaction(await client);
});

test("Create a Gavebrev of amount type without minimal income", async () => {
  const db = await client;

  await insertGavebrevData(db, {
    name: "John Smith",
    tin: "111111-1111",
    email: "hello@example.com",
    startYear: 2030,
    amount: 100,
  });

  const donors = await findAllDonors(db);
  expect(donors).toMatchObject([
    {
      name: "John Smith",
      tin: "111111-1111",
      email: "hello@example.com",
    },
  ]);

  const gavebrevs = await findAllGavebrevs(db);
  expect(gavebrevs).toMatchObject([
    {
      donor_id: donors[0].id,
      started_at: new Date(Date.UTC(2030, 0, 1)),
      stopped_at: new Date(Date.UTC(2040, 0, 1)),
      amount: 100,
      minimal_income: null,
      type: GavebrevType.Amount,
      status: GavebrevStatus.Created,
    },
  ]);

  const donations = await findAllDonations(db);
  expect(donations).toHaveLength(0);

  const charges = await findAllCharges(db);
  expect(charges).toHaveLength(0);
});

test("Create a Gavebrev of percentage type with minimal income", async () => {
  const db = await client;

  await insertGavebrevData(db, {
    name: "John Smith",
    tin: "111111-1111",
    email: "hello@example.com",
    startYear: 2030,
    percentage: 10,
    minimalIncome: 200,
  });

  const donors = await findAllDonors(db);
  expect(donors).toMatchObject([
    {
      name: "John Smith",
      tin: "111111-1111",
      email: "hello@example.com",
    },
  ]);

  const gavebrevs = await findAllGavebrevs(db);
  expect(gavebrevs).toMatchObject([
    {
      donor_id: donors[0].id,
      started_at: new Date(Date.UTC(2030, 0, 1)),
      stopped_at: new Date(Date.UTC(2040, 0, 1)),
      amount: 10,
      minimal_income: 200,
      type: GavebrevType.Percentage,
      status: GavebrevStatus.Created,
    },
  ]);

  const donations = await findAllDonations(db);
  expect(donations).toHaveLength(0);

  const charges = await findAllCharges(db);
  expect(charges).toHaveLength(0);
});

test("Creating second Gavebrev for the same donor should reuse donor record", async () => {
  const db = await client;

  await insertGavebrevData(db, {
    name: "John Smith",
    tin: "111111-1111",
    email: "hello@example.com",
    startYear: 2030,
    percentage: 10,
    minimalIncome: 200,
  });

  await insertGavebrevData(db, {
    name: "John Smith",
    tin: "111111-1111",
    email: "hello@example.com",
    startYear: 2031,
    percentage: 20,
  });

  await insertGavebrevData(db, {
    name: "Jane Smith",
    tin: "222222-2222",
    email: "hello@example.com",
    startYear: 2031,
    percentage: 20,
    minimalIncome: 300,
  });

  const donors = await findAllDonors(db);
  donors.sort((a, b) => a.tin.localeCompare(b.tin));
  expect(donors).toMatchObject([
    {
      name: "John Smith",
      tin: "111111-1111",
      email: "hello@example.com",
    },
    {
      name: "Jane Smith",
      tin: "222222-2222",
      email: "hello@example.com",
    },
  ]);

  const gavebrevs = await findAllGavebrevs(db);
  expect(gavebrevs).toMatchObject([
    {
      donor_id: donors[0].id,
      started_at: new Date(Date.UTC(2030, 0, 1)),
      stopped_at: new Date(Date.UTC(2040, 0, 1)),
      amount: 10,
      minimal_income: 200,
      type: GavebrevType.Percentage,
      status: GavebrevStatus.Created,
    },
    {
      donor_id: donors[0].id,
      started_at: new Date(Date.UTC(2031, 0, 1)),
      stopped_at: new Date(Date.UTC(2041, 0, 1)),
      amount: 20,
      type: GavebrevType.Percentage,
      status: GavebrevStatus.Created,
    },
    {
      donor_id: donors[1].id,
      started_at: new Date(Date.UTC(2031, 0, 1)),
      stopped_at: new Date(Date.UTC(2041, 0, 1)),
      amount: 20,
      minimal_income: 300,
      type: GavebrevType.Percentage,
      status: GavebrevStatus.Created,
    },
  ]);

  const donations = await findAllDonations(db);
  expect(donations).toHaveLength(0);

  const charges = await findAllCharges(db);
  expect(charges).toHaveLength(0);
});
