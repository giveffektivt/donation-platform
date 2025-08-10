import { setDate, subMonths, subYears } from "date-fns";
import {
  ChargeStatus,
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  DonationFrequency,
  DonationRecipient,
  EmailedStatus,
  getDonationsToEmail,
  getDonationToUpdateQuickpayPaymentInfoById,
  getFailedRecurringDonations,
  insertCharge,
  insertDonationViaBankTransfer,
  insertDonationViaQuickpay,
  insertDonationViaScanpay,
  insertDonor,
  insertMembershipViaQuickpay,
  PaymentMethod,
  setDonationCancelledById,
  setDonationEmailed,
} from "src";
import { afterEach, beforeEach, expect, test } from "vitest";
import { utc } from "./helpers";
import { insertChargeWithCreatedAt } from "./repository";

const client = dbClient();

beforeEach(async () => {
  await dbBeginTransaction(await client);
});

afterEach(async () => {
  await dbRollbackTransaction(await client);
});

test("Finds first successful donations to email", async () => {
  const db = await client;

  // Two donors
  const donor1 = await insertDonor(db, {
    email: "hello@example.com",
  });

  const donor2 = await insertDonor(db, {
    email: "world@example.com",
  });

  // ...having two and one donations correspondingly
  const donation1 = await insertMembershipViaQuickpay(db, {
    donor_id: donor1.id,
    method: PaymentMethod.CreditCard,
  });

  const donation2 = await insertDonationViaScanpay(db, {
    donor_id: donor1.id,
    amount: 77,
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    tax_deductible: true,
  });

  const donation3 = await insertMembershipViaQuickpay(db, {
    donor_id: donor2.id,
    method: PaymentMethod.CreditCard,
  });

  // ...each successfully charged (one even twice)
  await insertCharge(db, {
    donation_id: donation1.id,
    status: ChargeStatus.Charged,
  });

  await insertCharge(db, {
    donation_id: donation1.id,
    status: ChargeStatus.Charged,
  });

  await insertCharge(db, {
    donation_id: donation2.id,
    status: ChargeStatus.Charged,
  });

  await insertCharge(db, {
    donation_id: donation3.id,
    status: ChargeStatus.Charged,
  });

  // ...should result in 3 emails
  const toEmail = await getDonationsToEmail(db);

  const expected = [
    {
      id: donation1.id,
      email: donor1.email,
      amount: 50,
      recipient: DonationRecipient.GivEffektivtsMedlemskab,
      frequency: DonationFrequency.Yearly,
      tax_deductible: false,
    },
    {
      id: donation2.id,
      email: donor1.email,
      amount: 77,
      recipient: DonationRecipient.VitaminModMangelsygdomme,
      frequency: DonationFrequency.Monthly,
      tax_deductible: true,
    },
    {
      id: donation3.id,
      email: donor2.email,
      amount: 50,
      recipient: DonationRecipient.GivEffektivtsMedlemskab,
      frequency: DonationFrequency.Yearly,
      tax_deductible: false,
    },
  ];

  toEmail.sort((a, b) => a.id.localeCompare(b.id));
  expected.sort((a, b) => a.id.localeCompare(b.id));

  expect(toEmail).toEqual(expected);
});

test("Should not email to a credit card one-time donation that wasn't charged yet", async () => {
  const db = await client;

  const donor = await insertDonor(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationViaQuickpay(db, {
    donor_id: donor.id,
    amount: 77,
    recipient: DonationRecipient.GivEffektivtsAnbefaling,
    frequency: DonationFrequency.Once,
    method: PaymentMethod.CreditCard,
    tax_deductible: true,
  });

  expect(await getDonationsToEmail(db)).toEqual([]);
});

test("Should not email to a credit card one-time donation with a failed charge", async () => {
  const db = await client;

  const donor = await insertDonor(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationViaQuickpay(db, {
    donor_id: donor.id,
    amount: 77,
    recipient: DonationRecipient.GivEffektivtsAnbefaling,
    frequency: DonationFrequency.Once,
    method: PaymentMethod.CreditCard,
    tax_deductible: true,
  });

  await insertCharge(db, {
    donation_id: donation.id,
    status: ChargeStatus.Error,
  });

  expect(await getDonationsToEmail(db)).toEqual([]);
});

test("Should not email to a credit card recurring donation that wasn't charged yet", async () => {
  const db = await client;

  const donor = await insertDonor(db, {
    email: "hello@example.com",
  });

  const donation = await insertMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  await insertCharge(db, {
    donation_id: donation.id,
    status: ChargeStatus.Waiting,
  });

  expect(await getDonationsToEmail(db)).toEqual([]);
});

test("Should not email to a credit card recurring donation with a failed charge", async () => {
  const db = await client;

  const donor = await insertDonor(db, {
    email: "hello@example.com",
  });

  const donation = await insertMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  await insertCharge(db, {
    donation_id: donation.id,
    status: ChargeStatus.Error,
  });

  expect(await getDonationsToEmail(db)).toEqual([]);
});

test("Should not email to a MobilePay one-time donation that wasn't charged yet", async () => {
  const db = await client;

  const donor = await insertDonor(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationViaQuickpay(db, {
    donor_id: donor.id,
    amount: 77,
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    frequency: DonationFrequency.Once,
    method: PaymentMethod.MobilePay,
    tax_deductible: true,
  });

  expect(await getDonationsToEmail(db)).toEqual([]);
});

test("Should not email to a MobilePay one-time donation with a failed charge", async () => {
  const db = await client;

  const donor = await insertDonor(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationViaQuickpay(db, {
    donor_id: donor.id,
    amount: 77,
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    frequency: DonationFrequency.Once,
    method: PaymentMethod.MobilePay,
    tax_deductible: true,
  });

  await insertCharge(db, {
    donation_id: donation.id,
    status: ChargeStatus.Error,
  });

  expect(await getDonationsToEmail(db)).toEqual([]);
});

test("Should email to a MobilePay recurring donation even if it wasn't charged yet - special case!", async () => {
  const db = await client;

  const donor = await insertDonor(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationViaQuickpay(db, {
    donor_id: donor.id,
    amount: 77,
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.MobilePay,
    tax_deductible: true,
  });

  await insertCharge(db, {
    donation_id: donation.id,
    status: ChargeStatus.Waiting,
  });

  expect(await getDonationsToEmail(db)).toEqual([
    {
      id: donation.id,
      email: donor.email,
      amount: 77,
      recipient: DonationRecipient.VitaminModMangelsygdomme,
      frequency: DonationFrequency.Monthly,
      tax_deductible: true,
    },
  ]);
});

test("Should not email to a MobilePay recurring donation with a failed charge", async () => {
  const db = await client;

  const donor = await insertDonor(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationViaQuickpay(db, {
    donor_id: donor.id,
    amount: 77,
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.MobilePay,
    tax_deductible: true,
  });

  await insertCharge(db, {
    donation_id: donation.id,
    status: ChargeStatus.Error,
  });

  expect(await getDonationsToEmail(db)).toEqual([]);
});

test("Should not email to a donation that was already emailed", async () => {
  const db = await client;

  const donor = await insertDonor(db, {
    email: "hello@example.com",
  });

  const donation = await insertMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  await insertCharge(db, {
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });

  await setDonationEmailed(db, donation, EmailedStatus.Yes);

  // ...even if it was successfully charged again
  await insertCharge(db, {
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });

  expect(await getDonationsToEmail(db)).toEqual([]);
});

test("Should not email to a donation that was already attempted to be emailed", async () => {
  const db = await client;

  const donor = await insertDonor(db, {
    email: "hello@example.com",
  });

  const donation = await insertMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  await insertCharge(db, {
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });

  await setDonationEmailed(db, donation, EmailedStatus.Attempted);

  // ...even if it was successfully charged again
  await insertCharge(db, {
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });

  expect(await getDonationsToEmail(db)).toEqual([]);
});

test("Finds failed recurring donations to email", async () => {
  const db = await client;

  const now = setDate(new Date(), 1);

  const donor = await insertDonor(db, {
    email: "hello@example.com",
    name: "John Smith",
  });

  // Membership that was successful first time, but failed on a second charge
  const donation1 = await insertMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subYears(now, 3)),
    donation_id: donation1.id,
    status: ChargeStatus.Charged,
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subYears(now, 2)),
    donation_id: donation1.id,
    status: ChargeStatus.Error,
  });

  // Monthly donation that succeeded on a first two charges, but failed on the last charge
  const donation2 = await insertDonationViaQuickpay(db, {
    donor_id: donor.id,
    amount: 11,
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    tax_deductible: true,
    fundraiser_id: "00000000-0000-0000-0000-000000000000",
    message: "hello world",
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subMonths(now, 3)),
    donation_id: donation2.id,
    status: ChargeStatus.Charged,
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subMonths(now, 2)),
    donation_id: donation2.id,
    status: ChargeStatus.Charged,
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subMonths(now, 1)),
    donation_id: donation2.id,
    status: ChargeStatus.Error,
  });

  // Membership that never got a charge
  const donation3 = await insertMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  // Membership that got stuck in 'waiting' charge
  const donation4 = await insertMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subYears(now, 3)),
    donation_id: donation4.id,
    status: ChargeStatus.Waiting,
  });

  // Membership that failed on the very first and only charge
  const donation5 = await insertMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subYears(now, 3)),
    donation_id: donation5.id,
    status: ChargeStatus.Error,
  });

  // Donation that succeeded on a first charge, failed on a second charge, and succeeded on the third charge
  const donation6 = await insertDonationViaQuickpay(db, {
    donor_id: donor.id,
    amount: 11,
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    tax_deductible: true,
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subMonths(now, 3)),
    donation_id: donation6.id,
    status: ChargeStatus.Charged,
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subMonths(now, 2)),
    donation_id: donation6.id,
    status: ChargeStatus.Error,
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subMonths(now, 1)),
    donation_id: donation6.id,
    status: ChargeStatus.Charged,
  });

  // Cancelled donation that succeeded on a first charge and failed on the second charge
  const donation7 = await insertDonationViaQuickpay(db, {
    donor_id: donor.id,
    amount: 22,
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.MobilePay,
    tax_deductible: true,
  });

  await setDonationCancelledById(db, donation7.id);

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subMonths(now, 2)),
    donation_id: donation7.id,
    status: ChargeStatus.Charged,
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subMonths(now, 1)),
    donation_id: donation7.id,
    status: ChargeStatus.Error,
  });

  // One-time donation that failed to charge
  const donation8 = await insertDonationViaQuickpay(db, {
    donor_id: donor.id,
    amount: 33,
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    frequency: DonationFrequency.Once,
    method: PaymentMethod.CreditCard,
    tax_deductible: true,
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subMonths(now, 1)),
    donation_id: donation8.id,
    status: ChargeStatus.Error,
  });

  // Donation using bank transfer that succeeded on the first charge and failed on the second
  const donation9 = await insertDonationViaBankTransfer(db, {
    donor_id: donor.id,
    amount: 44,
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    frequency: DonationFrequency.Monthly,
    tax_deductible: true,
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subMonths(now, 2)),
    donation_id: donation9.id,
    status: ChargeStatus.Charged,
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subMonths(now, 1)),
    donation_id: donation9.id,
    status: ChargeStatus.Error,
  });

  // ...should result in 2 emails
  const toEmail = await getFailedRecurringDonations(db);

  const expected = [
    {
      donor_id: donor.id,
      donor_name: donor.name,
      donor_email: donor.email,
      donation_id: donation1.id,
      amount: donation1.amount,
      recipient: donation1.recipient,
      frequency: donation1.frequency,
      tax_deductible: donation1.tax_deductible,
      method: donation1.method,
    },
    {
      donor_id: donor.id,
      donor_name: donor.name,
      donor_email: donor.email,
      donation_id: donation2.id,
      amount: donation2.amount,
      recipient: donation2.recipient,
      frequency: donation2.frequency,
      tax_deductible: donation2.tax_deductible,
      method: donation2.method,
      fundraiser_id: "00000000-0000-0000-0000-000000000000",
      message: "hello world",
    },
  ];

  toEmail.sort((a, b) => a.donation_id.localeCompare(b.donation_id));
  expected.sort((a, b) => a.donation_id.localeCompare(b.donation_id));

  expect(toEmail).toMatchObject(expected);
});

test("Finds donations that can get a link to renew payment", async () => {
  const db = await client;

  const now = setDate(new Date(), 1);

  const donor = await insertDonor(db, {
    email: "hello@example.com",
    name: "John Smith",
  });

  // Membership with no charges yet
  const donation1 = await insertMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  // Monthly donation with no charges yet
  const donation2 = await insertDonationViaQuickpay(db, {
    donor_id: donor.id,
    amount: 11,
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    tax_deductible: true,
  });

  // Monthly donation with pre-created charge in 'created' state
  const donation3 = await insertDonationViaQuickpay(db, {
    donor_id: donor.id,
    amount: 11,
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    tax_deductible: true,
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subYears(now, 3)),
    donation_id: donation3.id,
    status: ChargeStatus.Created,
  });

  // Membership that was charged before
  const donation4 = await insertMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subYears(now, 1)),
    donation_id: donation4.id,
    status: ChargeStatus.Charged,
  });

  // Recurring donation that has a charge associated (even if not successful)
  const donation5 = await insertDonationViaQuickpay(db, {
    donor_id: donor.id,
    amount: 11,
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    tax_deductible: true,
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subYears(now, 3)),
    donation_id: donation5.id,
    status: ChargeStatus.Waiting,
  });

  // Cancelled membership
  const donation6 = await insertMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  await setDonationCancelledById(db, donation6.id);

  // One-time donation with no charge
  const donation7 = await insertDonationViaQuickpay(db, {
    donor_id: donor.id,
    amount: 11,
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    frequency: DonationFrequency.Once,
    method: PaymentMethod.CreditCard,
    tax_deductible: true,
  });

  // Bank-transfer donation
  const donation8 = await insertDonationViaBankTransfer(db, {
    donor_id: donor.id,
    amount: 44,
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    frequency: DonationFrequency.Monthly,
    tax_deductible: true,
  });

  // ...should allow only the first two donations to renew payment
  expect(
    await getDonationToUpdateQuickpayPaymentInfoById(db, donation1.id),
  ).toEqual(donation1);
  expect(
    await getDonationToUpdateQuickpayPaymentInfoById(db, donation2.id),
  ).toEqual(donation2);
  expect(
    await getDonationToUpdateQuickpayPaymentInfoById(db, donation3.id),
  ).toEqual(donation3);
  expect(
    await getDonationToUpdateQuickpayPaymentInfoById(db, donation4.id),
  ).toEqual(undefined);
  expect(
    await getDonationToUpdateQuickpayPaymentInfoById(db, donation5.id),
  ).toEqual(undefined);
  expect(
    await getDonationToUpdateQuickpayPaymentInfoById(db, donation6.id),
  ).toEqual(undefined);
  expect(
    await getDonationToUpdateQuickpayPaymentInfoById(db, donation7.id),
  ).toEqual(undefined);
  expect(
    await getDonationToUpdateQuickpayPaymentInfoById(db, donation8.id),
  ).toEqual(undefined);
});
