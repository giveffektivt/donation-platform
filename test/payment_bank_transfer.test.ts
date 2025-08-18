import {
  DonationFrequency,
  DonationRecipient,
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  EmailedStatus,
  insertBankTransferData,
  PaymentGateway,
  PaymentMethod,
} from "src";
import { afterEach, beforeEach, expect, test } from "vitest";
import {
  findAllCharges,
  findAllDonations,
  findAllDonors,
  findAllEarmarks,
} from "./repository";

const client = dbClient();

beforeEach(async () => {
  await dbBeginTransaction(await client);
});

afterEach(async () => {
  await dbRollbackTransaction(await client);
});

test("One-time donation using bank transfer", async () => {
  const db = await client;

  const [donor, donation] = await insertBankTransferData(db, {
    amount: 10,
    email: "hello@example.com",
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    frequency: DonationFrequency.Once,
    method: PaymentMethod.BankTransfer,
    tin: undefined,
    taxDeductible: false,
    subscribeToNewsletter: false,
  });

  const donors = await findAllDonors(db);
  expect(donors).toMatchObject([
    {
      id: donor.id,
      email: "hello@example.com",
      tin: null,
    },
  ]);

  const donations = await findAllDonations(db);
  expect(donations).toMatchObject([
    {
      id: donation.id,
      amount: 10,
      cancelled: false,
      donor_id: donor.id,
      emailed: EmailedStatus.No,
      frequency: DonationFrequency.Once,
      gateway: PaymentGateway.BankTransfer,
      method: PaymentMethod.BankTransfer,
      tax_deductible: false,
    },
  ]);
  expect(donations[0].gateway_metadata.bank_msg.substring(0, 2)).toEqual("d-");
  expect(donations[0].gateway_metadata.bank_msg).toHaveLength(6);

  const earmarks = await findAllEarmarks(db);
  expect(earmarks).toMatchObject([
    {
      donation_id: donation.id,
      recipient: DonationRecipient.VitaminModMangelsygdomme,
      percentage: 100,
    },
  ]);

  const charges = await findAllCharges(db);
  expect(charges).toHaveLength(0);
});

test("Monthly donation using bank transfer", async () => {
  const db = await client;

  const [donor, donation] = await insertBankTransferData(db, {
    amount: 10,
    email: "hello@example.com",
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.BankTransfer,
    tin: undefined,
    taxDeductible: false,
    subscribeToNewsletter: false,
  });

  const donors = await findAllDonors(db);
  expect(donors).toMatchObject([
    {
      id: donor.id,
      email: "hello@example.com",
      tin: null,
    },
  ]);

  const donations = await findAllDonations(db);
  expect(donations).toMatchObject([
    {
      id: donation.id,
      amount: 10,
      cancelled: false,
      donor_id: donor.id,
      emailed: EmailedStatus.No,
      frequency: DonationFrequency.Monthly,
      gateway: PaymentGateway.BankTransfer,
      method: PaymentMethod.BankTransfer,
      tax_deductible: false,
    },
  ]);
  expect(donations[0].gateway_metadata.bank_msg.substring(0, 2)).toEqual("d-");
  expect(donations[0].gateway_metadata.bank_msg).toHaveLength(6);

  const earmarks = await findAllEarmarks(db);
  expect(earmarks).toMatchObject([
    {
      donation_id: donation.id,
      recipient: DonationRecipient.VitaminModMangelsygdomme,
      percentage: 100,
    },
  ]);

  const charges = await findAllCharges(db);
  expect(charges).toHaveLength(0);
});
