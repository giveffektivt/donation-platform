import {
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  insertDonor,
} from "src";
import { afterEach, beforeEach, expect, test } from "vitest";
import { findAllDonors } from "./repository";

const client = dbClient();

beforeEach(async () => {
  await dbBeginTransaction(await client);
});

afterEach(async () => {
  await dbRollbackTransaction(await client);
});

test("Insert donor same email different tin", async () => {
  const db = await client;

  await insertDonor(db, {
    email: "hello@example.com",
  });

  await insertDonor(db, {
    email: "hello@example.com",
    tin: "111111-1111",
    name: "John",
  });

  await insertDonor(db, {
    email: "hello@example.com",
    tin: "11111111",
    name: "John ApS",
  });

  const allDonors = await findAllDonors(db);

  expect(allDonors).toMatchObject([
    {
      address: null,
      birthday: null,
      city: null,
      country: null,
      email: "hello@example.com",
      name: null,
      postcode: null,
      tin: null,
    },
    {
      address: null,
      birthday: null,
      city: null,
      country: null,
      email: "hello@example.com",
      name: "John",
      postcode: null,
      tin: "111111-1111",
    },
    {
      address: null,
      birthday: null,
      city: null,
      country: null,
      email: "hello@example.com",
      name: "John ApS",
      postcode: null,
      tin: "11111111",
    },
  ]);
});

test("Insert donor same email same tin enriches same record with new info", async () => {
  const db = await client;

  await insertDonor(db, {
    email: "hello@example.com",
  });

  await insertDonor(db, {
    email: "hello@example.com",
    tin: "111111-1111",
  });

  expect(await findAllDonors(db)).toMatchObject([
    {
      address: null,
      birthday: null,
      city: null,
      country: null,
      email: "hello@example.com",
      name: null,
      postcode: null,
      tin: null,
    },
    {
      address: null,
      birthday: null,
      city: null,
      country: null,
      email: "hello@example.com",
      name: null,
      postcode: null,
      tin: "111111-1111",
    },
  ]);

  await insertDonor(db, {
    email: "hello@example.com",
    name: "Anon",
    country: "Sweden",
  });

  await insertDonor(db, {
    email: "hello@example.com",
    tin: "111111-1111",
    name: "John",
    country: "Denmark",
    address: "Street 1",
    postcode: "1234",
    city: "Copenhagen",
  });

  expect(await findAllDonors(db)).toMatchObject([
    {
      address: null,
      birthday: null,
      city: null,
      country: "Sweden",
      email: "hello@example.com",
      name: "Anon",
      postcode: null,
      tin: null,
    },
    {
      address: "Street 1",
      birthday: null,
      city: "Copenhagen",
      country: "Denmark",
      email: "hello@example.com",
      name: "John",
      postcode: "1234",
      tin: "111111-1111",
    },
  ]);

  await insertDonor(db, {
    email: "hello@example.com",
    tin: "111111-1111",
    name: "John Smith",
    country: "Denmark",
    address: "Street 2",
  });

  expect(await findAllDonors(db)).toMatchObject([
    {
      address: null,
      birthday: null,
      city: null,
      country: "Sweden",
      email: "hello@example.com",
      name: "Anon",
      postcode: null,
      tin: null,
    },
    {
      address: "Street 2",
      birthday: null,
      city: "Copenhagen",
      country: "Denmark",
      email: "hello@example.com",
      name: "John Smith",
      postcode: "1234",
      tin: "111111-1111",
    },
  ]);
});
