import {
  DonationFrequency,
  DonationRecipient,
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  EmailedStatus,
  insertDonationEarmark,
  insertDonationViaBankTransfer,
  insertDonationViaQuickpay,
  insertDonor,
  insertFundraiser,
  insertMembershipViaQuickpay,
  PaymentGateway,
  PaymentMethod,
} from "src";
import { afterEach, beforeEach, expect, test } from "vitest";
import { findAllEarmarks } from "./repository";

const client = dbClient();

beforeEach(async () => {
  await dbBeginTransaction(await client);
});

afterEach(async () => {
  await dbRollbackTransaction(await client);
});

test("Insert donation for Giv Effektivt membership using Quickpay", async () => {
  const db = await client;

  const donor = await insertDonor(db, {
    email: "hello@example.com",
  });

  const donation = await insertMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  expect(donation).toMatchObject({
    donor_id: donor.id,
    emailed: EmailedStatus.No,
    amount: 50,
    frequency: DonationFrequency.Yearly,
    cancelled: false,
    method: PaymentMethod.CreditCard,
    tax_deductible: false,
    gateway: PaymentGateway.Quickpay,
    fundraiser_id: null,
  });

  await insertDonationEarmark(
    db,
    donation.id,
    DonationRecipient.GivEffektivtsMedlemskab,
    100,
  );
  const earmarks = await findAllEarmarks(db);

  expect(earmarks).toMatchObject([
    {
      donation_id: donation.id,
      recipient: DonationRecipient.GivEffektivtsMedlemskab,
      percentage: 100,
    },
  ]);
});

test("Insert donation using Quickpay", async () => {
  const db = await client;

  const donor = await insertDonor(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationViaQuickpay(db, {
    donor_id: donor.id,
    amount: 123,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.MobilePay,
    tax_deductible: true,
  });

  expect(donation).toMatchObject({
    donor_id: donor.id,
    emailed: EmailedStatus.No,
    amount: 123,
    frequency: DonationFrequency.Monthly,
    cancelled: false,
    method: PaymentMethod.MobilePay,
    tax_deductible: true,
    gateway: PaymentGateway.Quickpay,
  });

  await insertDonationEarmark(
    db,
    donation.id,
    DonationRecipient.MyggenetModMalaria,
    99,
  );
  await insertDonationEarmark(
    db,
    donation.id,
    DonationRecipient.GivEffektivtsArbejdeOgVækst,
    1,
  );

  const earmarks = await findAllEarmarks(db);
  earmarks.sort((a, b) => a.recipient.localeCompare(b.recipient));

  expect(earmarks).toMatchObject([
    {
      donation_id: donation.id,
      recipient: DonationRecipient.GivEffektivtsArbejdeOgVækst,
      percentage: 1,
    },
    {
      donation_id: donation.id,
      recipient: DonationRecipient.MyggenetModMalaria,
      percentage: 99,
    },
  ]);
});

test("Insert donation using bank transfer", async () => {
  const db = await client;

  const donor = await insertDonor(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationViaBankTransfer(db, {
    donor_id: donor.id,
    amount: 123,
    frequency: DonationFrequency.Monthly,
    tax_deductible: true,
  });

  expect(donation).toMatchObject({
    donor_id: donor.id,
    emailed: EmailedStatus.No,
    amount: 123,
    frequency: DonationFrequency.Monthly,
    cancelled: false,
    method: PaymentMethod.BankTransfer,
    tax_deductible: true,
    gateway: PaymentGateway.BankTransfer,
    fundraiser_id: null,
  });

  await insertDonationEarmark(
    db,
    donation.id,
    DonationRecipient.MyggenetModMalaria,
    99,
  );
  await insertDonationEarmark(
    db,
    donation.id,
    DonationRecipient.GivEffektivtsArbejdeOgVækst,
    1,
  );

  const earmarks = await findAllEarmarks(db);
  earmarks.sort((a, b) => a.recipient.localeCompare(b.recipient));

  expect(earmarks).toMatchObject([
    {
      donation_id: donation.id,
      recipient: DonationRecipient.GivEffektivtsArbejdeOgVækst,
      percentage: 1,
    },
    {
      donation_id: donation.id,
      recipient: DonationRecipient.MyggenetModMalaria,
      percentage: 99,
    },
  ]);
});

test("Insert donation with fundraiser using Quickpay", async () => {
  const db = await client;

  const fundraiser = await insertFundraiser(db, {
    email: "hello@example.com",
    title: "Birthday",
    has_match: false,
  });

  const donor = await insertDonor(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationViaQuickpay(db, {
    donor_id: donor.id,
    amount: 123,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.MobilePay,
    tax_deductible: true,
    fundraiser_id: fundraiser.id,
  });

  expect(donation).toMatchObject({
    donor_id: donor.id,
    emailed: EmailedStatus.No,
    amount: 123,
    frequency: DonationFrequency.Monthly,
    cancelled: false,
    method: PaymentMethod.MobilePay,
    tax_deductible: true,
    gateway: PaymentGateway.Quickpay,
    fundraiser_id: fundraiser.id,
  });

  await insertDonationEarmark(
    db,
    donation.id,
    DonationRecipient.MyggenetModMalaria,
    99,
  );
  await insertDonationEarmark(
    db,
    donation.id,
    DonationRecipient.GivEffektivtsArbejdeOgVækst,
    1,
  );

  const earmarks = await findAllEarmarks(db);
  earmarks.sort((a, b) => a.recipient.localeCompare(b.recipient));

  expect(earmarks).toMatchObject([
    {
      donation_id: donation.id,
      recipient: DonationRecipient.GivEffektivtsArbejdeOgVækst,
      percentage: 1,
    },
    {
      donation_id: donation.id,
      recipient: DonationRecipient.MyggenetModMalaria,
      percentage: 99,
    },
  ]);
});

test("Insert donation with fundraiser using bank transfer", async () => {
  const db = await client;

  const fundraiser = await insertFundraiser(db, {
    email: "hello@example.com",
    title: "Birthday",
    has_match: false,
  });

  const donor = await insertDonor(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationViaBankTransfer(db, {
    donor_id: donor.id,
    amount: 123,
    frequency: DonationFrequency.Monthly,
    tax_deductible: true,
    fundraiser_id: fundraiser.id,
  });

  expect(donation).toMatchObject({
    donor_id: donor.id,
    emailed: EmailedStatus.No,
    amount: 123,
    frequency: DonationFrequency.Monthly,
    cancelled: false,
    method: PaymentMethod.BankTransfer,
    tax_deductible: true,
    gateway: PaymentGateway.BankTransfer,
    fundraiser_id: fundraiser.id,
  });

  await insertDonationEarmark(
    db,
    donation.id,
    DonationRecipient.MyggenetModMalaria,
    99,
  );
  await insertDonationEarmark(
    db,
    donation.id,
    DonationRecipient.GivEffektivtsArbejdeOgVækst,
    1,
  );

  const earmarks = await findAllEarmarks(db);
  earmarks.sort((a, b) => a.recipient.localeCompare(b.recipient));

  expect(earmarks).toMatchObject([
    {
      donation_id: donation.id,
      recipient: DonationRecipient.GivEffektivtsArbejdeOgVækst,
      percentage: 1,
    },
    {
      donation_id: donation.id,
      recipient: DonationRecipient.MyggenetModMalaria,
      percentage: 99,
    },
  ]);
});

test("Insert donation with a custom message", async () => {
  const db = await client;

  const donor = await insertDonor(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationViaQuickpay(db, {
    donor_id: donor.id,
    amount: 123,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.MobilePay,
    tax_deductible: true,
    message: "hello world",
  });

  expect(donation).toMatchObject({
    donor_id: donor.id,
    emailed: EmailedStatus.No,
    amount: 123,
    frequency: DonationFrequency.Monthly,
    cancelled: false,
    method: PaymentMethod.MobilePay,
    tax_deductible: true,
    gateway: PaymentGateway.Quickpay,
    message: "hello world",
  });

  await insertDonationEarmark(
    db,
    donation.id,
    DonationRecipient.MyggenetModMalaria,
    99,
  );
  await insertDonationEarmark(
    db,
    donation.id,
    DonationRecipient.GivEffektivtsArbejdeOgVækst,
    1,
  );

  const earmarks = await findAllEarmarks(db);
  earmarks.sort((a, b) => a.recipient.localeCompare(b.recipient));

  expect(earmarks).toMatchObject([
    {
      donation_id: donation.id,
      recipient: DonationRecipient.GivEffektivtsArbejdeOgVækst,
      percentage: 1,
    },
    {
      donation_id: donation.id,
      recipient: DonationRecipient.MyggenetModMalaria,
      percentage: 99,
    },
  ]);
});
