import { setDate, subMonths, subYears } from "date-fns";
import {
  ChargeStatus,
  DonationFrequency,
  DonationRecipient,
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  insertChargesForDonationsToCreateCharges,
  PaymentMethod,
  registerDonationViaBankTransfer,
  registerDonationViaQuickpay,
  registerMembershipViaQuickpay,
} from "src";
import { afterEach, beforeEach, expect, test } from "vitest";
import { utc } from "./helpers";
import {
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

test("Insert charges for donations that need new charges", async () => {
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
    tax_deductible: false,
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
    tax_deductible: true,
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

  const newCharges = await insertChargesForDonationsToCreateCharges(db);

  const expected = [
    {
      donation_id: donation1.id,
      created_at: utc(subYears(now, 1)),
      status: ChargeStatus.Created,
    },
    {
      donation_id: donation3.id,
      created_at: utc(now),
      status: ChargeStatus.Created,
    },
    {
      donation_id: donation4.id,
      created_at: utc(now),
      status: ChargeStatus.Created,
    },
  ];

  newCharges.sort((a, b) => a.donation_id.localeCompare(b.donation_id));
  expected.sort((a, b) => a.donation_id.localeCompare(b.donation_id));

  expect(newCharges).toMatchObject(expected);
});

test("Donation that has no charges should not have new charges created", async () => {
  const db = await client;

  await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 100,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    tax_deductible: false,
    earmarks: [
      { recipient: DonationRecipient.GivEffektivtsAnbefaling, percentage: 95 },
      { recipient: DonationRecipient.MedicinModMalaria, percentage: 5 },
    ],
  });

  expect(await insertChargesForDonationsToCreateCharges(db)).toEqual([]);
});

test("Donation that is cancelled should not have new charges created", async () => {
  const db = await client;

  const donation = await registerDonationViaQuickpay(db, {
    email: "hello@example.com",
    amount: 100,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    tax_deductible: false,
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

  expect(await insertChargesForDonationsToCreateCharges(db)).toEqual([]);
});

test("Bank transfer donation should not have new charges created", async () => {
  const db = await client;

  const donation = await registerDonationViaBankTransfer(db, {
    email: "hello@example.com",
    amount: 100,
    frequency: DonationFrequency.Once,
    tax_deductible: false,
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

  expect(await insertChargesForDonationsToCreateCharges(db)).toEqual([]);
});

test("Active donation whose past charge was unsuccessful should *still* have new charges created (until we set it as cancelled)", async () => {
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

  const expected = [
    {
      donation_id: donation.id,
      created_at: utc(subYears(now, 1)),
      status: ChargeStatus.Created,
    },
  ];

  expect(await insertChargesForDonationsToCreateCharges(db)).toMatchObject(
    expected,
  );
});
