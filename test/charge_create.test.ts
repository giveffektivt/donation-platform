import { addMonths, setDate, subMonths, subYears } from "date-fns";
import {
  ChargeStatus,
  DonationFrequency,
  DonationRecipient,
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  PaymentMethod,
  registerDonationViaBankTransfer,
  registerDonationViaQuickpay,
  registerMembershipViaQuickpay,
} from "src";
import { afterEach, beforeEach, expect, test } from "vitest";
import { utc } from "./helpers";
import {
  getChargesToCreate,
  getScheduleMembershipsCharges,
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

test("Donations due for a new charge appear with correct next charge date", async () => {
  const db = await client;

  // Two donors having two donations each (3 recurring and 1 one-time)
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
    amount: 88,
    frequency: DonationFrequency.Once,
    method: PaymentMethod.CreditCard,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  const donation3 = await registerDonationViaQuickpay(db, {
    email: "world@example.com",
    amount: 77,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    taxDeductible: true,
    tin: "222222-2222",
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  const donation4 = await registerMembershipViaQuickpay(db, {
    email: "world@example.com",
    tin: "222222-2222",
    name: "John",
    address: "Street 1",
    postcode: "1234",
    city: "Copenhagen",
    country: "Denmark",
  });

  const now = setDate(new Date(), 1);

  // ...each successfully charged in the past
  await insertChargeWithCreatedAt(db, {
    created_at: utc(subYears(now, 3)),
    donation_id: donation1.id,
    status: ChargeStatus.Charged,
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subYears(now, 2)),
    donation_id: donation1.id,
    status: ChargeStatus.Charged,
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subMonths(now, 1)),
    donation_id: donation2.id,
    status: ChargeStatus.Charged,
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subMonths(now, 1)),
    donation_id: donation3.id,
    status: ChargeStatus.Charged,
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subYears(now, 1)),
    donation_id: donation4.id,
    status: ChargeStatus.Charged,
  });

  const chargesToCreate = await getChargesToCreate(db);

  const expected = [
    { donation_id: donation1.id, next_charge: utc(subYears(now, 1)) },
    { donation_id: donation3.id, next_charge: utc(now) },
    { donation_id: donation4.id, next_charge: utc(now) },
  ];

  chargesToCreate.sort((a, b) => a.donation_id.localeCompare(b.donation_id));
  expected.sort((a, b) => a.donation_id.localeCompare(b.donation_id));

  expect(chargesToCreate).toMatchObject(expected);
});

test("Donation that has no charges does not appear in the create charges view", async () => {
  const db = await client;

  await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 100,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  expect(await getChargesToCreate(db)).toEqual([]);
});

test("Cancelled donation does not appear in the create charges view", async () => {
  const db = await client;

  const donation = await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 100,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  await setDonationCancelledById(db, donation.id);

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subYears(new Date(), 2)),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });

  expect(await getChargesToCreate(db)).toEqual([]);
});

test("Bank transfer donation does not appear in the create charges view", async () => {
  const db = await client;

  const donation = await registerDonationViaBankTransfer(db, {
    email: "hello@example.com",
    amount: 100,
    frequency: DonationFrequency.Once,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subYears(new Date(), 2)),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });

  expect(await getChargesToCreate(db)).toEqual([]);
});

test("Active donation with a past failed charge still appears in the create charges view", async () => {
  const db = await client;

  const donation = await registerMembershipViaQuickpay(db, {
    email: "world@example.com",
    tin: "111111-1111",
    name: "John",
    address: "Street 1",
    postcode: "1234",
    city: "Copenhagen",
    country: "Denmark",
  });

  const now = setDate(new Date(), 1);

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subYears(now, 2)),
    donation_id: donation.id,
    status: ChargeStatus.Error,
  });

  expect(await getChargesToCreate(db)).toMatchObject([
    { donation_id: donation.id, next_charge: utc(subYears(now, 1)) },
  ]);
});

test("Donations with already scheduled future charges should not get more charges created", async () => {
  const db = await client;
  const now = setDate(new Date(), 1);

  const donationA = await registerDonationViaQuickpay(db, {
    email: "donor-a@example.com",
    amount: 100,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  const donationB = await registerDonationViaQuickpay(db, {
    email: "donor-b@example.com",
    amount: 100,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subMonths(now, 2)),
    donation_id: donationA.id,
    status: ChargeStatus.Charged,
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(addMonths(now, 1)),
    donation_id: donationA.id,
    status: ChargeStatus.Created,
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subMonths(now, 2)),
    donation_id: donationB.id,
    status: ChargeStatus.Error,
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(addMonths(now, 1)),
    donation_id: donationB.id,
    status: ChargeStatus.Created,
  });

  expect(await getChargesToCreate(db)).toEqual([]);
});

test("Card membership charged last December is scheduled for this April", async () => {
  const db = await client;
  const currentYear = new Date().getFullYear();

  const donation = await registerMembershipViaQuickpay(db, {
    email: "hello@example.com",
    tin: "111111-1111",
    name: "John",
    address: "Street 1",
    postcode: "1234",
    city: "Copenhagen",
    country: "Denmark",
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(new Date(currentYear - 1, 11, 15)),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });

  expect(await getScheduleMembershipsCharges(db)).toMatchObject([
    {
      donation_id: donation.id,
      next_charged_at: utc(new Date(currentYear, 3, 5)),
    },
  ]);
});

test("Card membership charged this January is scheduled for this April", async () => {
  const db = await client;
  const currentYear = new Date().getFullYear();

  const donation = await registerMembershipViaQuickpay(db, {
    email: "hello@example.com",
    tin: "111111-1111",
    name: "John",
    address: "Street 1",
    postcode: "1234",
    city: "Copenhagen",
    country: "Denmark",
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(new Date(currentYear, 0, 15)),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });

  expect(await getScheduleMembershipsCharges(db)).toMatchObject([
    {
      donation_id: donation.id,
      next_charged_at: utc(new Date(currentYear, 3, 5)),
    },
  ]);
});

test("MobilePay membership charged this January is scheduled for next April", async () => {
  const db = await client;
  const currentYear = new Date().getFullYear();

  const donation = await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 50,
    frequency: DonationFrequency.Yearly,
    method: PaymentMethod.MobilePay,
    taxDeductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsMedlemskab, percentage: 100 },
    ],
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(new Date(currentYear, 0, 15)),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });

  expect(await getScheduleMembershipsCharges(db)).toMatchObject([
    {
      donation_id: donation.id,
      next_charged_at: utc(new Date(currentYear + 1, 3, 5)),
    },
  ]);
});

test("Card membership charged this March is scheduled for next April", async () => {
  const db = await client;
  const currentYear = new Date().getFullYear();

  const donation = await registerMembershipViaQuickpay(db, {
    email: "hello@example.com",
    tin: "111111-1111",
    name: "John",
    address: "Street 1",
    postcode: "1234",
    city: "Copenhagen",
    country: "Denmark",
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(new Date(currentYear, 2, 15)),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });

  expect(await getScheduleMembershipsCharges(db)).toMatchObject([
    {
      donation_id: donation.id,
      next_charged_at: utc(new Date(currentYear + 1, 3, 5)),
    },
  ]);
});
