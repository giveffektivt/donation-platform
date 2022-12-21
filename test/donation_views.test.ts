import {
  ChargeStatus,
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  DonationFrequency,
  DonationRecipient,
  EmailedStatus,
  getDonationIdsByOldDonorId,
  getDonationsToEmail,
  insertCharge,
  insertDonationViaQuickpay,
  insertDonationViaScanpay,
  insertDonorWithSensitiveInfo,
  insertMembershipViaQuickpay,
  PaymentMethod,
  setDonationEmailed,
} from "src";
import { afterEach, beforeEach, expect, test } from "vitest";
import { insertOldDonor } from "./repository";

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
  const donor1 = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donor2 = await insertDonorWithSensitiveInfo(db, {
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
      recipient: DonationRecipient.GivEffektivt,
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
      recipient: DonationRecipient.GivEffektivt,
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

  const donor = await insertDonorWithSensitiveInfo(db, {
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

  const donor = await insertDonorWithSensitiveInfo(db, {
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

  const donor = await insertDonorWithSensitiveInfo(db, {
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

  const donor = await insertDonorWithSensitiveInfo(db, {
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

  const donor = await insertDonorWithSensitiveInfo(db, {
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

  const donor = await insertDonorWithSensitiveInfo(db, {
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

  const donor = await insertDonorWithSensitiveInfo(db, {
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

  const donor = await insertDonorWithSensitiveInfo(db, {
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

  const donor = await insertDonorWithSensitiveInfo(db, {
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

  const donor = await insertDonorWithSensitiveInfo(db, {
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

test("Should find donation ID by old donor ID", async () => {
  const db = await client;

  const oldDonor = await insertOldDonor(db, {
    email: "hello@example.com",
    _old_id: "123",
  });

  const newDonor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const oldDonation1 = await insertMembershipViaQuickpay(db, {
    donor_id: oldDonor.id,
    method: PaymentMethod.CreditCard,
  });

  const oldDonation2 = await insertMembershipViaQuickpay(db, {
    donor_id: oldDonor.id,
    method: PaymentMethod.CreditCard,
  });

  const newDonation1 = await insertMembershipViaQuickpay(db, {
    donor_id: newDonor.id,
    method: PaymentMethod.CreditCard,
  });

  const newDonation2 = await insertMembershipViaQuickpay(db, {
    donor_id: newDonor.id,
    method: PaymentMethod.CreditCard,
  });

  await insertCharge(db, {
    donation_id: oldDonation1.id,
    status: ChargeStatus.Charged,
  });

  await insertCharge(db, {
    donation_id: newDonation1.id,
    status: ChargeStatus.Charged,
  });

  expect(await getDonationIdsByOldDonorId(db, oldDonor._old_id)).toEqual([
    oldDonation1.id,
    oldDonation2.id,
  ]);
});
