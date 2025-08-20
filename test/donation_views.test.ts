import { setDate, subMonths, subYears } from "date-fns";
import {
  ChargeStatus,
  DonationFrequency,
  DonationRecipient,
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  EmailedStatus,
  getDonationsToEmail,
  getDonationToUpdateQuickpayPaymentInfoById,
  getFailedRecurringDonations,
  insertCharge,
  PaymentMethod,
  registerDonationViaBankTransfer,
  registerDonationViaQuickpay,
  registerMembershipViaQuickpay,
  setDonationEmailed,
} from "src";
import { afterEach, beforeEach, expect, test } from "vitest";
import { utc } from "./helpers";
import {
  findAllDonors,
  insertChargeWithCreatedAt,
  setDonationCancelledById,
} from "./repository";

const client = dbClient();

beforeEach(async () => {
  await dbBeginTransaction(await client);
});

afterEach(async () => {
  await dbRollbackTransaction(await client);
});

test("Finds first successful donations to email", async () => {
  const db = await client;

  // Two donors having two and one donations correspondingly
  const donation1 = await registerMembershipViaQuickpay(db, {
    email: "hello@example.com",
    tin: "111111-1111",
    name: "John",
    address: "Street 1",
    postcode: "1234",
    city: "Copenhagen",
    country: "Denmark",
  });

  const donation2 = await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 77,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    taxDeductible: true,
    tin: "111111-1111",
    earmarks: [
      {
        recipient: DonationRecipient.VitaminModMangelsygdomme,
        percentage: 100,
      },
    ],
  });

  const donation3 = await registerMembershipViaQuickpay(db, {
    email: "world@example.com",
    tin: "222222-2222",
    name: "John",
    address: "Street 1",
    postcode: "1234",
    city: "Copenhagen",
    country: "Denmark",
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
      email: "hello@example.com",
      amount: 50,
      recipient: DonationRecipient.GivEffektivtsMedlemskab,
      frequency: DonationFrequency.Yearly,
      tax_deductible: false,
    },
    {
      id: donation2.id,
      email: "hello@example.com",
      amount: 77,
      recipient: DonationRecipient.VitaminModMangelsygdomme,
      frequency: DonationFrequency.Monthly,
      tax_deductible: true,
    },
    {
      id: donation3.id,
      email: "world@example.com",
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

test("Should not include recipient if donation is earmarked using %-split", async () => {
  const db = await client;

  const donation = await registerDonationViaQuickpay(db, {
    email: "world@example.com",
    amount: 77,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  await insertCharge(db, {
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });

  const toEmail = await getDonationsToEmail(db);

  const expected = [
    {
      id: donation.id,
      email: "world@example.com",
      amount: 77,
      recipient: null,
      frequency: DonationFrequency.Monthly,
      tax_deductible: false,
    },
  ];

  expect(toEmail).toEqual(expected);
});

test("Should not email to a credit card one-time donation that wasn't charged yet", async () => {
  const db = await client;

  await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 88,
    frequency: DonationFrequency.Once,
    method: PaymentMethod.CreditCard,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  expect(await getDonationsToEmail(db)).toEqual([]);
});

test("Should not email to a credit card one-time donation with a failed charge", async () => {
  const db = await client;

  const donation = await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 88,
    frequency: DonationFrequency.Once,
    method: PaymentMethod.CreditCard,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  await insertCharge(db, {
    donation_id: donation.id,
    status: ChargeStatus.Error,
  });

  expect(await getDonationsToEmail(db)).toEqual([]);
});

test("Should not email to a credit card recurring donation that wasn't charged yet", async () => {
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

  await insertCharge(db, {
    donation_id: donation.id,
    status: ChargeStatus.Waiting,
  });

  expect(await getDonationsToEmail(db)).toEqual([]);
});

test("Should not email to a credit card recurring donation with a failed charge", async () => {
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

  await insertCharge(db, {
    donation_id: donation.id,
    status: ChargeStatus.Error,
  });

  expect(await getDonationsToEmail(db)).toEqual([]);
});

test("Should not email to a MobilePay one-time donation that wasn't charged yet", async () => {
  const db = await client;

  await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 88,
    frequency: DonationFrequency.Once,
    method: PaymentMethod.MobilePay,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  expect(await getDonationsToEmail(db)).toEqual([]);
});

test("Should not email to a MobilePay one-time donation with a failed charge", async () => {
  const db = await client;

  const donation = await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 88,
    frequency: DonationFrequency.Once,
    method: PaymentMethod.MobilePay,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  await insertCharge(db, {
    donation_id: donation.id,
    status: ChargeStatus.Error,
  });

  expect(await getDonationsToEmail(db)).toEqual([]);
});

test("Should email to a MobilePay recurring donation even if it wasn't charged yet - special case!", async () => {
  const db = await client;

  const donation = await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 77,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.MobilePay,
    taxDeductible: false,
    earmarks: [
      {
        recipient: DonationRecipient.VitaminModMangelsygdomme,
        percentage: 100,
      },
    ],
  });

  await insertCharge(db, {
    donation_id: donation.id,
    status: ChargeStatus.Waiting,
  });

  expect(await getDonationsToEmail(db)).toEqual([
    {
      id: donation.id,
      email: "hello@example.com",
      amount: 77,
      recipient: DonationRecipient.VitaminModMangelsygdomme,
      frequency: DonationFrequency.Monthly,
      tax_deductible: false,
    },
  ]);
});

test("Should not email to a MobilePay recurring donation with a failed charge", async () => {
  const db = await client;

  const donation = await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 88,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.MobilePay,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  await insertCharge(db, {
    donation_id: donation.id,
    status: ChargeStatus.Error,
  });

  expect(await getDonationsToEmail(db)).toEqual([]);
});

test("Should not email to a donation that was already emailed", async () => {
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

  const donation = await registerMembershipViaQuickpay(db, {
    email: "hello@example.com",
    tin: "111111-1111",
    name: "John",
    address: "Street 1",
    postcode: "1234",
    city: "Copenhagen",
    country: "Denmark",
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

  const donation1 = await registerMembershipViaQuickpay(db, {
    email: "hello@example.com",
    tin: "111111-1111",
    name: "John",
    address: "Street 1",
    postcode: "1234",
    city: "Copenhagen",
    country: "Denmark",
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
  const donation2 = await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 88,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    taxDeductible: true,
    tin: "111111-1111",
    earmarks: [
      {
        recipient: DonationRecipient.VitaminModMangelsygdomme,
        percentage: 100,
      },
    ],
    fundraiserId: "00000000-0000-0000-0000-000000000000",
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
  await registerMembershipViaQuickpay(db, {
    email: "hello@example.com",
    tin: "111111-1111",
    name: "John",
    address: "Street 1",
    postcode: "1234",
    city: "Copenhagen",
    country: "Denmark",
  });

  // Membership that got stuck in 'waiting' charge
  const donation4 = await registerMembershipViaQuickpay(db, {
    email: "hello@example.com",
    tin: "111111-1111",
    name: "John",
    address: "Street 1",
    postcode: "1234",
    city: "Copenhagen",
    country: "Denmark",
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subYears(now, 3)),
    donation_id: donation4.id,
    status: ChargeStatus.Waiting,
  });

  // Membership that failed on the very first and only charge
  const donation5 = await registerMembershipViaQuickpay(db, {
    email: "hello@example.com",
    tin: "111111-1111",
    name: "John",
    address: "Street 1",
    postcode: "1234",
    city: "Copenhagen",
    country: "Denmark",
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subYears(now, 3)),
    donation_id: donation5.id,
    status: ChargeStatus.Error,
  });

  // Donation that succeeded on a first charge, failed on a second charge, and succeeded on the third charge
  const donation6 = await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 88,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    taxDeductible: true,
    tin: "111111-1111",
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
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
  const donation7 = await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 88,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.MobilePay,
    taxDeductible: true,
    tin: "111111-1111",
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
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
  const donation8 = await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 88,
    frequency: DonationFrequency.Once,
    method: PaymentMethod.CreditCard,
    taxDeductible: true,
    tin: "111111-1111",
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subMonths(now, 1)),
    donation_id: donation8.id,
    status: ChargeStatus.Error,
  });

  // Donation using bank transfer that succeeded on the first charge and failed on the second
  const donation9 = await registerDonationViaBankTransfer(db, {
    email: "hello@example.com",
    amount: 100,
    frequency: DonationFrequency.Monthly,
    taxDeductible: true,
    tin: "111111-1111",
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
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

  const donors = await findAllDonors(db);

  const expected = [
    {
      donor_id: donors[0].id,
      donor_name: donors[0].name,
      donor_email: donors[0].email,
      donation_id: donation1.id,
      amount: donation1.amount,
      recipient: DonationRecipient.GivEffektivtsMedlemskab,
      frequency: donation1.frequency,
      tax_deductible: donation1.tax_deductible,
      method: donation1.method,
    },
    {
      donor_id: donors[0].id,
      donor_name: donors[0].name,
      donor_email: donors[0].email,
      donation_id: donation2.id,
      amount: donation2.amount,
      recipient: DonationRecipient.VitaminModMangelsygdomme,
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

  // Membership with no charges yet
  const donation1 = await registerMembershipViaQuickpay(db, {
    email: "hello@example.com",
    tin: "111111-1111",
    name: "John",
    address: "Street 1",
    postcode: "1234",
    city: "Copenhagen",
    country: "Denmark",
  });

  // Monthly donation with no charges yet
  const donation2 = await registerDonationViaQuickpay(db, {
    email: "world@example.com",
    amount: 77,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  // Monthly donation with pre-created charge in 'created' state
  const donation3 = await registerDonationViaQuickpay(db, {
    email: "world@example.com",
    amount: 77,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subYears(now, 3)),
    donation_id: donation3.id,
    status: ChargeStatus.Created,
  });

  // Membership that was charged before
  const donation4 = await registerMembershipViaQuickpay(db, {
    email: "hello@example.com",
    tin: "111111-1111",
    name: "John",
    address: "Street 1",
    postcode: "1234",
    city: "Copenhagen",
    country: "Denmark",
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subYears(now, 1)),
    donation_id: donation4.id,
    status: ChargeStatus.Charged,
  });

  // Recurring donation that has a charge associated (even if not successful)
  const donation5 = await registerDonationViaQuickpay(db, {
    email: "world@example.com",
    amount: 77,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subYears(now, 3)),
    donation_id: donation5.id,
    status: ChargeStatus.Waiting,
  });

  // Cancelled membership
  const donation6 = await registerMembershipViaQuickpay(db, {
    email: "hello@example.com",
    tin: "111111-1111",
    name: "John",
    address: "Street 1",
    postcode: "1234",
    city: "Copenhagen",
    country: "Denmark",
  });

  await setDonationCancelledById(db, donation6.id);

  // One-time donation with no charge
  const donation7 = await registerDonationViaQuickpay(db, {
    email: "world@example.com",
    amount: 77,
    frequency: DonationFrequency.Once,
    method: PaymentMethod.CreditCard,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  // Bank-transfer donation
  const donation8 = await registerDonationViaBankTransfer(db, {
    email: "hello@example.com",
    amount: 100,
    frequency: DonationFrequency.Monthly,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
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
