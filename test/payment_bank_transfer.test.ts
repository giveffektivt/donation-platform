import {
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  DonationFrequency,
  DonationRecipient,
  EmailedStatus,
  insertBankTransferData,
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

test("One-time donation using bank transfer", async () => {
  const db = await client;

  await insertBankTransferData(db, {
    amount: 10,
    email: "hello@example.com",
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    subscription: "oneTime",
    membership: false,
    membershipOnly: false,
    method: "bankTransfer",
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
      gateway: PaymentGateway.BankTransfer,
      method: PaymentMethod.BankTransfer,
      recipient: DonationRecipient.VitaminModMangelsygdomme,
      tax_deductible: false,
    },
  ]);
  expect(donations[0].gateway_metadata.bank_msg).toHaveLength(4);

  const charges = await findAllCharges(db);
  expect(charges).toHaveLength(0);
});

test("Monthly donation using bank transfer", async () => {
  const db = await client;

  await insertBankTransferData(db, {
    amount: 10,
    email: "hello@example.com",
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    subscription: "everyMonth",
    membership: false,
    membershipOnly: false,
    method: "bankTransfer",
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
      gateway: PaymentGateway.BankTransfer,
      method: PaymentMethod.BankTransfer,
      recipient: DonationRecipient.VitaminModMangelsygdomme,
      tax_deductible: false,
    },
  ]);
  expect(donations[0].gateway_metadata.bank_msg).toHaveLength(4);

  const charges = await findAllCharges(db);
  expect(charges).toHaveLength(0);
});

test("One-time donation using bank transfer + membership", async () => {
  const db = await client;

  await insertBankTransferData(db, {
    amount: 10,
    email: "hello@example.com",
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    subscription: "oneTime",
    membership: true,
    membershipOnly: false,
    method: "bankTransfer",
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
  donations.sort((a, b) => a.amount - b.amount);
  expect(donations).toMatchObject([
    {
      amount: 10,
      cancelled: false,
      donor_id: donors[0].id,
      emailed: EmailedStatus.No,
      frequency: DonationFrequency.Once,
      gateway: PaymentGateway.BankTransfer,
      method: PaymentMethod.BankTransfer,
      recipient: DonationRecipient.VitaminModMangelsygdomme,
      tax_deductible: true,
    },
    {
      amount: 50,
      cancelled: false,
      donor_id: donors[0].id,
      emailed: EmailedStatus.No,
      frequency: DonationFrequency.Yearly,
      gateway: PaymentGateway.BankTransfer,
      method: PaymentMethod.BankTransfer,
      recipient: DonationRecipient.GivEffektivt,
      tax_deductible: false,
    },
  ]);

  const charges = await findAllCharges(db);
  expect(charges).toHaveLength(0);
});

test("Monthly donation using bank transfer + membership", async () => {
  const db = await client;

  await insertBankTransferData(db, {
    amount: 10,
    email: "hello@example.com",
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    subscription: "everyMonth",
    membership: true,
    membershipOnly: false,
    method: "bankTransfer",
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
  donations.sort((a, b) => a.amount - b.amount);
  expect(donations).toMatchObject([
    {
      amount: 10,
      cancelled: false,
      donor_id: donors[0].id,
      emailed: EmailedStatus.No,
      frequency: DonationFrequency.Monthly,
      gateway: PaymentGateway.BankTransfer,
      method: PaymentMethod.BankTransfer,
      recipient: DonationRecipient.VitaminModMangelsygdomme,
      tax_deductible: true,
    },
    {
      amount: 50,
      cancelled: false,
      donor_id: donors[0].id,
      emailed: EmailedStatus.No,
      frequency: DonationFrequency.Yearly,
      gateway: PaymentGateway.BankTransfer,
      method: PaymentMethod.BankTransfer,
      recipient: DonationRecipient.GivEffektivt,
      tax_deductible: false,
    },
  ]);

  const charges = await findAllCharges(db);
  expect(charges).toHaveLength(0);
});

test("Membership only", async () => {
  const db = await client;

  const submitData = {
    amount: 10,
    email: "hello@example.com",
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    subscription: "everyMonth",
    membership: true,
    membershipOnly: true,
    method: "bankTransfer",
    tin: "111111-1111",
    name: "John Smith",
    address: "Some street",
    city: "Copenhagen",
    zip: "1234",
    taxDeduction: true,
  };

  await expect(insertBankTransferData(db, submitData)).rejects.toThrow(
    "Bank transfer is not supported for membership-only payments"
  );
});
