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
    method: "mobilePay",
    tin: undefined,
    taxDeduction: false,
    subscribeToNewsletter: false,
  });

  const donors = await findAllDonors(db);
  expect(donors).toMatchObject([
    {
      email: "hello@example.com",
      tin: null,
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
    method: "creditCard",
    tin: undefined,
    taxDeduction: false,
    subscribeToNewsletter: false,
  });

  const donors = await findAllDonors(db);
  expect(donors).toMatchObject([
    {
      email: "hello@example.com",
      tin: null,
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
