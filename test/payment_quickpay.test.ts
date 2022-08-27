import {
  ChargeStatus,
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  DonationFrequency,
  DonationRecipient,
  EmailedStatus,
  insertQuickpayData,
  PaymentGateway,
  PaymentMethod,
  setDonationQuickpayId,
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

test("One-time donation using Quickpay", async () => {
  const db = await client;

  await insertQuickpayData(db, {
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
      gateway: PaymentGateway.Quickpay,
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

test("Monthly donation using Quickpay", async () => {
  const db = await client;

  await insertQuickpayData(db, {
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
      gateway: PaymentGateway.Quickpay,
      method: PaymentMethod.CreditCard,
      recipient: DonationRecipient.VitaminModMangelsygdomme,
      tax_deductible: false,
    },
  ]);

  const charges = await findAllCharges(db);
  expect(charges).toHaveLength(0);
});

test("Membership using Quickpay", async () => {
  const db = await client;

  await insertQuickpayData(db, {
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
      gateway: PaymentGateway.Quickpay,
      method: PaymentMethod.CreditCard,
      recipient: DonationRecipient.GivEffektivt,
      tax_deductible: false,
    },
  ]);

  const charges = await findAllCharges(db);
  expect(charges).toHaveLength(0);
});

test("Add quickpay_id while preserving quickpay_order on the donation", async () => {
  const db = await client;

  await insertQuickpayData(db, {
    amount: 10,
    email: "hello@example.com",
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    subscription: "everyMonth",
    membership: false,
    method: "creditCard",
    tin: "111111-1111",
    name: "John Smith",
    address: "Some street",
    city: "Copenhagen",
    zip: "1234",
    taxDeduction: true,
  });

  const insertedDonations = await findAllDonations(db);
  expect(insertedDonations).toHaveLength(1);

  const insertedDonation = insertedDonations[0];
  const quickpayOrder = insertedDonation.gateway_metadata.quickpay_order;
  expect(quickpayOrder).toHaveLength(4);

  const quickpayId = "some-id";
  insertedDonation.gateway_metadata.quickpay_id = quickpayId;
  await setDonationQuickpayId(db, insertedDonation);

  const donors = await findAllDonors(db);
  const donations = await findAllDonations(db);
  donations.sort((a, b) => a.amount - b.amount);
  expect(donations).toMatchObject([
    {
      amount: 10,
      cancelled: false,
      donor_id: donors[0].id,
      emailed: EmailedStatus.No,
      frequency: DonationFrequency.Monthly,
      gateway: PaymentGateway.Quickpay,
      method: PaymentMethod.CreditCard,
      recipient: DonationRecipient.VitaminModMangelsygdomme,
      tax_deductible: true,
      gateway_metadata: {
        quickpay_id: quickpayId,
        quickpay_order: quickpayOrder,
      },
    },
  ]);

  const charges = await findAllCharges(db);
  expect(charges).toHaveLength(0);
});
