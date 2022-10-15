import {
  ChargeStatus,
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  DonationFrequency,
  DonationRecipient,
  EmailedStatus,
  insertScanpayData,
  PaymentGateway,
  PaymentMethod,
} from "src";
import { afterEach, beforeEach, expect, test } from "vitest";
import { findAllCharges, findAllDonations, findAllDonors } from "./repository";

const client = dbClient();

beforeEach(async () => {
  await dbBeginTransaction(await client);
});

afterEach(async () => {
  await dbRollbackTransaction(await client);
});

test("One-time donation using Scanpay", async () => {
  const db = await client;

  await insertScanpayData(db, {
    amount: 10,
    email: "hello@example.com",
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    subscription: "oneTime",
    membership: false,
    method: "mobilePay",
    tin: undefined,
    name: undefined,
    address: undefined,
    city: undefined,
    zip: undefined,
    taxDeduction: false,
  });

  const donors = await findAllDonors(db);
  expect(donors).toMatchObject([
    {
      email: "hello@example.com",
      address: null,
      city: null,
      tin: null,
      name: null,
      postcode: null,
    },
  ]);

  const donations = await findAllDonations(db);
  expect(donations).toMatchObject([
    {
      amount: 10,
      cancelled: false,
      donor_id: donors[0].id,
      emailed: EmailedStatus.No,
      frequency: DonationFrequency.Once,
      gateway: PaymentGateway.Scanpay,
      method: PaymentMethod.MobilePay,
      recipient: DonationRecipient.VitaminModMangelsygdomme,
      tax_deductible: false,
    },
  ]);

  const charges = await findAllCharges(db);
  expect(charges).toMatchObject([
    {
      donation_id: donations[0].id,
      status: ChargeStatus.Waiting,
    },
  ]);
});

test("Monthly donation using Scanpay", async () => {
  const db = await client;

  await insertScanpayData(db, {
    amount: 10,
    email: "hello@example.com",
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    subscription: "everyMonth",
    membership: false,
    method: "creditCard",
    tin: undefined,
    name: undefined,
    address: undefined,
    city: undefined,
    zip: undefined,
    taxDeduction: false,
  });

  const donors = await findAllDonors(db);
  expect(donors).toMatchObject([
    {
      email: "hello@example.com",
      address: null,
      city: null,
      tin: null,
      name: null,
      postcode: null,
    },
  ]);

  const donations = await findAllDonations(db);
  expect(donations).toMatchObject([
    {
      amount: 10,
      cancelled: false,
      donor_id: donors[0].id,
      emailed: EmailedStatus.No,
      frequency: DonationFrequency.Monthly,
      gateway: PaymentGateway.Scanpay,
      method: PaymentMethod.CreditCard,
      recipient: DonationRecipient.VitaminModMangelsygdomme,
      tax_deductible: false,
    },
  ]);

  const charges = await findAllCharges(db);
  expect(charges).toHaveLength(0);
});

test("Membership using Scanpay", async () => {
  const db = await client;

  await insertScanpayData(db, {
    // Since it's a temporary solution,
    // some of those fields will simply be unused for membership-only payments
    amount: 10,
    email: "hello@example.com",
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    subscription: "everyMonth",
    membership: true,
    method: "creditCard",
    tin: "111111-1111",
    name: "John Smith",
    address: "Some street",
    city: "Copenhagen",
    zip: "1234",
    taxDeduction: true,
  });

  const donors = await findAllDonors(db);
  expect(donors).toMatchObject([
    {
      email: "hello@example.com",
      address: "Some street",
      city: "Copenhagen",
      tin: "111111-1111",
      name: "John Smith",
      postcode: "1234",
    },
  ]);

  const donations = await findAllDonations(db);
  expect(donations).toMatchObject([
    {
      amount: 50,
      cancelled: false,
      donor_id: donors[0].id,
      emailed: EmailedStatus.No,
      frequency: DonationFrequency.Yearly,
      gateway: PaymentGateway.Scanpay,
      method: PaymentMethod.CreditCard,
      recipient: DonationRecipient.GivEffektivt,
      tax_deductible: false,
    },
  ]);

  const charges = await findAllCharges(db);
  expect(charges).toHaveLength(0);
});
