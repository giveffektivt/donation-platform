import {
  DonationFrequency,
  DonationRecipient,
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  EmailedStatus,
  insertFundraiser,
  PaymentGateway,
  PaymentMethod,
  registerDonationViaBankTransfer,
  registerDonationViaQuickpay,
  registerMembershipViaQuickpay,
} from "src";
import { afterEach, beforeEach, expect, test } from "vitest";
import { findAllDonations, findAllEarmarks } from "./repository";

const client = dbClient();

beforeEach(async () => {
  await dbBeginTransaction(await client);
});

afterEach(async () => {
  await dbRollbackTransaction(await client);
});

test("Insert donation for Giv Effektivt membership using Quickpay", async () => {
  const db = await client;

  const donation = await registerMembershipViaQuickpay(db, {
    email: "hello@example.com",
    tin: "111111-1111",
    name: "John",
    address: "Street 1",
    postcode: "1234",
    city: "Copenhagen",
    country: "Denmark",
  });

  const expected = {
    id: donation.id,
    emailed: EmailedStatus.No,
    amount: 50,
    frequency: DonationFrequency.Yearly,
    cancelled: false,
    method: PaymentMethod.CreditCard,
    tax_deductible: false,
    gateway: PaymentGateway.Quickpay,
    fundraiser_id: null,
  };
  expect(donation).toMatchObject(expected);
  expect(await findAllDonations(db)).toMatchObject([expected]);

  expect(await findAllEarmarks(db)).toMatchObject([
    {
      donation_id: donation.id,
      recipient: DonationRecipient.GivEffektivtsMedlemskab,
      percentage: 100,
    },
  ]);
});

test("Insert donation using Quickpay", async () => {
  const db = await client;

  const donation = await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 123,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.MobilePay,
    taxDeductible: true,
    tin: "111111-1111",
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  const expected = {
    id: donation.id,
    emailed: EmailedStatus.No,
    amount: 123,
    frequency: DonationFrequency.Monthly,
    cancelled: false,
    method: PaymentMethod.MobilePay,
    tax_deductible: true,
    gateway: PaymentGateway.Quickpay,
    fundraiser_id: null,
  };
  expect(donation).toMatchObject(expected);
  expect(await findAllDonations(db)).toMatchObject([expected]);

  const earmarks = await findAllEarmarks(db);
  expect(earmarks).toMatchObject([
    {
      donation_id: donation.id,
      recipient: DonationRecipient.GivEffektivtsAnbefaling,
      percentage: 95,
    },
    {
      donation_id: donation.id,
      recipient: DonationRecipient.MedicinModMalaria,
      percentage: 5,
    },
  ]);
});

test("Insert donation using bank transfer", async () => {
  const db = await client;

  const donation = await registerDonationViaBankTransfer(db, {
    email: "hello@example.com",
    amount: 123,
    frequency: DonationFrequency.Monthly,
    taxDeductible: true,
    tin: "111111-1111",
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  const expected = {
    id: donation.id,
    emailed: EmailedStatus.No,
    amount: 123,
    frequency: DonationFrequency.Monthly,
    cancelled: false,
    method: PaymentMethod.BankTransfer,
    tax_deductible: true,
    gateway: PaymentGateway.BankTransfer,
    fundraiser_id: null,
  };
  expect(donation).toMatchObject(expected);
  expect(await findAllDonations(db)).toMatchObject([expected]);

  const earmarks = await findAllEarmarks(db);
  expect(earmarks).toMatchObject([
    {
      donation_id: donation.id,
      recipient: DonationRecipient.GivEffektivtsAnbefaling,
      percentage: 95,
    },
    {
      donation_id: donation.id,
      recipient: DonationRecipient.MedicinModMalaria,
      percentage: 5,
    },
  ]);
});

test("Insert donation with fundraiser and message using Quickpay", async () => {
  const db = await client;

  const fundraiser = await insertFundraiser(db, {
    email: "hello@example.com",
    title: "Birthday",
    has_match: false,
  });

  const donation = await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 123,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.MobilePay,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
    fundraiserId: fundraiser.id,
    message: "Happy Birthday!",
  });

  const expected = {
    id: donation.id,
    emailed: EmailedStatus.No,
    amount: 123,
    frequency: DonationFrequency.Monthly,
    cancelled: false,
    method: PaymentMethod.MobilePay,
    tax_deductible: false,
    gateway: PaymentGateway.Quickpay,
    fundraiser_id: fundraiser.id,
    message: "Happy Birthday!",
  };
  expect(donation).toMatchObject(expected);
  expect(await findAllDonations(db)).toMatchObject([expected]);

  const earmarks = await findAllEarmarks(db);
  expect(earmarks).toMatchObject([
    {
      donation_id: donation.id,
      recipient: DonationRecipient.GivEffektivtsAnbefaling,
      percentage: 95,
    },
    {
      donation_id: donation.id,
      recipient: DonationRecipient.MedicinModMalaria,
      percentage: 5,
    },
  ]);
});

test("Insert donation with fundraiser and message using bank transfer", async () => {
  const db = await client;

  const fundraiser = await insertFundraiser(db, {
    email: "hello@example.com",
    title: "Birthday",
    has_match: false,
  });

  const donation = await registerDonationViaBankTransfer(db, {
    email: "hello@example.com",
    amount: 123,
    frequency: DonationFrequency.Monthly,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
    fundraiserId: fundraiser.id,
    message: "Happy Birthday!",
  });

  const expected = {
    id: donation.id,
    emailed: EmailedStatus.No,
    amount: 123,
    frequency: DonationFrequency.Monthly,
    cancelled: false,
    method: PaymentMethod.BankTransfer,
    tax_deductible: false,
    gateway: PaymentGateway.BankTransfer,
    fundraiser_id: fundraiser.id,
    message: "Happy Birthday!",
  };
  expect(donation).toMatchObject(expected);
  expect(await findAllDonations(db)).toMatchObject([expected]);

  const earmarks = await findAllEarmarks(db);
  expect(earmarks).toMatchObject([
    {
      donation_id: donation.id,
      recipient: DonationRecipient.GivEffektivtsAnbefaling,
      percentage: 95,
    },
    {
      donation_id: donation.id,
      recipient: DonationRecipient.MedicinModMalaria,
      percentage: 5,
    },
  ]);
});
