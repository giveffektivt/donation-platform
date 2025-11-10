import {
  DonationFrequency,
  DonationRecipient,
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  PaymentMethod,
  registerDonationViaQuickpay,
  registerMembershipViaQuickpay,
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

  await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 300,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 80 },
      { recipient: DonationRecipient.VaccinerTilSpædbørn, percentage: 20 },
    ],
  });

  await registerMembershipViaQuickpay(db, {
    email: "hello@example.com",
    tin: "111111-1111",
    name: "John",
    address: "Street 1",
    postcode: "1234",
    city: "Copenhagen",
    country: "Denmark",
  });

  await registerMembershipViaQuickpay(db, {
    email: "hello@example.com",
    tin: "11111111",
    name: "John ApS",
    address: "Street 2",
    postcode: "9999",
    city: "Oslo",
    country: "Norway",
  });

  const allDonors = await findAllDonors(db);
  allDonors.sort((a, b) => (a.address ?? "").localeCompare(b.address ?? ""));

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
      address: "Street 1",
      birthday: null,
      city: "Copenhagen",
      country: "Denmark",
      email: "hello@example.com",
      name: "John",
      postcode: "1234",
      tin: "111111-1111",
    },
    {
      address: "Street 2",
      birthday: null,
      city: "Oslo",
      country: "Norway",
      email: "hello@example.com",
      name: "John ApS",
      postcode: "9999",
      tin: "11111111",
    },
  ]);
});

test("Insert donor same email same tin enriches same record with new info", async () => {
  const db = await client;

  await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 300,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 80 },
      { recipient: DonationRecipient.VaccinerTilSpædbørn, percentage: 20 },
    ],
  });

  await registerMembershipViaQuickpay(db, {
    email: "hello@example.com",
    tin: "111111-1111",
    name: "John",
    address: "Street 1",
    postcode: "1234",
    city: "Copenhagen",
    country: "Denmark",
  });

  let allDonors = await findAllDonors(db);
  allDonors.sort((a, b) => (a.address ?? "").localeCompare(b.address ?? ""));
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

  await registerMembershipViaQuickpay(db, {
    email: "hello@example.com",
    tin: "111111-1111",
    name: "John Smith",
    address: "Street 2",
    postcode: "9999",
    city: "Oslo",
    country: "Norway",
  });

  allDonors = await findAllDonors(db);
  allDonors.sort((a, b) => (a.address ?? "").localeCompare(b.address ?? ""));
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
      address: "Street 2",
      birthday: null,
      city: "Oslo",
      country: "Norway",
      email: "hello@example.com",
      name: "John Smith",
      postcode: "9999",
      tin: "111111-1111",
    },
  ]);
});

test("Insert donor lowercases and trims email", async () => {
  const db = await client;

  await registerDonationViaQuickpay(db, {
    email: "  Hello@example.com   ",
    amount: 300,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 80 },
      { recipient: DonationRecipient.VaccinerTilSpædbørn, percentage: 20 },
    ],
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
  ]);
});
