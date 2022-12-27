import {
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  GavebrevStatus,
  GavebrevType,
  insertGavebrevData,
  setCreatedGavebrevStatus,
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

test("Should only be able to update gavebrev with status 'created'", async () => {
  const db = await client;

  await insertGavebrevData(db, {
    name: "John Smith",
    tin: "111111-1111",
    email: "hello@example.com",
    startYear: 2030,
    amount: 100,
  });

  const gavebrevs = await findAllGavebrevs(db);
  expect(gavebrevs).toMatchObject([{ status: GavebrevStatus.Created }]);

  await setCreatedGavebrevStatus(db, gavebrevs[0].id, GavebrevStatus.Active);
  expect(await findAllGavebrevs(db)).toMatchObject([
    { status: GavebrevStatus.Active },
  ]);

  await setCreatedGavebrevStatus(db, gavebrevs[0].id, GavebrevStatus.Rejected);
  expect(await findAllGavebrevs(db)).toMatchObject([
    { status: GavebrevStatus.Active },
  ]);
});
