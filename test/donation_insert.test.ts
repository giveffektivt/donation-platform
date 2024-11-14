import {
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  DonationFrequency,
  DonationRecipient,
  EmailedStatus,
  insertMembershipViaQuickpay,
  insertDonationViaBankTransfer,
  insertDonationViaScanpay,
  insertDonorWithSensitiveInfo,
  PaymentGateway,
  PaymentMethod,
  insertFundraiser,
  insertDonationViaQuickpay,
} from "src";
import { afterEach, beforeEach, expect, test } from "vitest";

const client = dbClient();

beforeEach(async () => {
  await dbBeginTransaction(await client);
});

afterEach(async () => {
  await dbRollbackTransaction(await client);
});

test("Insert donation for Giv Effektivt membership using Quickpay", async () => {
  const db = await client;

  const donor = await insertDonorWithSensitiveInfo(db, {
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
    recipient: DonationRecipient.GivEffektivt,
    frequency: DonationFrequency.Yearly,
    cancelled: false,
    method: PaymentMethod.CreditCard,
    tax_deductible: false,
    gateway: PaymentGateway.Quickpay,
    fundraiser_id: null,
  });
});

test("Insert donation using Scanpay", async () => {
  const db = await client;

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationViaScanpay(db, {
    donor_id: donor.id,
    amount: 123,
    recipient: DonationRecipient.MyggenetModMalaria,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.MobilePay,
    tax_deductible: true,
  });

  expect(donation).toMatchObject({
    donor_id: donor.id,
    emailed: EmailedStatus.No,
    amount: 123,
    recipient: DonationRecipient.MyggenetModMalaria,
    frequency: DonationFrequency.Monthly,
    cancelled: false,
    method: PaymentMethod.MobilePay,
    tax_deductible: true,
    gateway: PaymentGateway.Scanpay,
    fundraiser_id: null,
  });
});

test("Insert donation using bank transfer", async () => {
  const db = await client;

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationViaBankTransfer(db, {
    donor_id: donor.id,
    amount: 123,
    recipient: DonationRecipient.MyggenetModMalaria,
    frequency: DonationFrequency.Monthly,
    tax_deductible: true,
  });

  expect(donation).toMatchObject({
    donor_id: donor.id,
    emailed: EmailedStatus.No,
    amount: 123,
    recipient: DonationRecipient.MyggenetModMalaria,
    frequency: DonationFrequency.Monthly,
    cancelled: false,
    method: PaymentMethod.BankTransfer,
    tax_deductible: true,
    gateway: PaymentGateway.BankTransfer,
    fundraiser_id: null,
  });
});

test("Insert donation with fundraiser using Quickpay", async () => {
  const db = await client;

  const fundraiser = await insertFundraiser(db, {
    email: "hello@example.com",
    title: "Birthday",
  });

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationViaQuickpay(db, {
    donor_id: donor.id,
    amount: 123,
    recipient: DonationRecipient.MyggenetModMalaria,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.MobilePay,
    tax_deductible: true,
    fundraiser_id: fundraiser.id,
  });

  expect(donation).toMatchObject({
    donor_id: donor.id,
    emailed: EmailedStatus.No,
    amount: 123,
    recipient: DonationRecipient.MyggenetModMalaria,
    frequency: DonationFrequency.Monthly,
    cancelled: false,
    method: PaymentMethod.MobilePay,
    tax_deductible: true,
    gateway: PaymentGateway.Quickpay,
    fundraiser_id: fundraiser.id,
  });
});

test("Insert donation with fundraiser using bank transfer", async () => {
  const db = await client;

  const fundraiser = await insertFundraiser(db, {
    email: "hello@example.com",
    title: "Birthday",
  });

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationViaBankTransfer(db, {
    donor_id: donor.id,
    amount: 123,
    recipient: DonationRecipient.MyggenetModMalaria,
    frequency: DonationFrequency.Monthly,
    tax_deductible: true,
    fundraiser_id: fundraiser.id,
  });

  expect(donation).toMatchObject({
    donor_id: donor.id,
    emailed: EmailedStatus.No,
    amount: 123,
    recipient: DonationRecipient.MyggenetModMalaria,
    frequency: DonationFrequency.Monthly,
    cancelled: false,
    method: PaymentMethod.BankTransfer,
    tax_deductible: true,
    gateway: PaymentGateway.BankTransfer,
    fundraiser_id: fundraiser.id,
  });
});

test("Insert donation with a custom message", async () => {
  const db = await client;

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationViaQuickpay(db, {
    donor_id: donor.id,
    amount: 123,
    recipient: DonationRecipient.MyggenetModMalaria,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.MobilePay,
    tax_deductible: true,
    message: "hello world",
  });

  expect(donation).toMatchObject({
    donor_id: donor.id,
    emailed: EmailedStatus.No,
    amount: 123,
    recipient: DonationRecipient.MyggenetModMalaria,
    frequency: DonationFrequency.Monthly,
    cancelled: false,
    method: PaymentMethod.MobilePay,
    tax_deductible: true,
    gateway: PaymentGateway.Quickpay,
    message: "hello world",
  });
});
