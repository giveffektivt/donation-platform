import { addDays, setDate, subDays, subMonths, subYears } from "date-fns";
import {
  ChargeStatus,
  DonationFrequency,
  DonationRecipient,
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  getChargesToCharge,
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

test("Find created charges to charge", async () => {
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

  // ...each not charged yet
  const charge1 = await insertChargeWithCreatedAt(db, {
    created_at: utc(subYears(now, 3)),
    donation_id: donation1.id,
    status: ChargeStatus.Created,
  });
  const charge2 = await insertChargeWithCreatedAt(db, {
    created_at: utc(subYears(now, 2)),
    donation_id: donation1.id,
    status: ChargeStatus.Created,
  });
  const charge3 = await insertChargeWithCreatedAt(db, {
    created_at: utc(subMonths(now, 1)),
    donation_id: donation2.id,
    status: ChargeStatus.Created,
  });
  const charge4 = await insertChargeWithCreatedAt(db, {
    created_at: utc(subMonths(now, 1)),
    donation_id: donation3.id,
    status: ChargeStatus.Created,
  });
  const charge5 = await insertChargeWithCreatedAt(db, {
    created_at: utc(subYears(now, 1)),
    donation_id: donation4.id,
    status: ChargeStatus.Created,
  });

  const charges = await getChargesToCharge(db);

  const expected = [
    {
      id: charge1.id,
      amount: donation1.amount,
      email: "hello@example.com",
      gateway: donation1.gateway,
      method: donation1.method,
    },
    {
      id: charge2.id,
      amount: donation1.amount,
      email: "hello@example.com",
      gateway: donation1.gateway,
      method: donation1.method,
    },
    {
      id: charge3.id,
      amount: donation2.amount,
      email: "hello@example.com",
      gateway: donation2.gateway,
      method: donation2.method,
    },
    {
      id: charge4.id,
      amount: donation3.amount,
      email: "world@example.com",
      gateway: donation3.gateway,
      method: donation3.method,
    },
    {
      id: charge5.id,
      amount: donation4.amount,
      email: "world@example.com",
      gateway: donation4.gateway,
      method: donation4.method,
    },
  ];

  charges.sort((a, b) => a.id.localeCompare(b.id));
  expected.sort((a, b) => a.id.localeCompare(b.id));

  expect(charges).toMatchObject(expected);
});

test("Donation that has no charges should not be charged", async () => {
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

  expect(await getChargesToCharge(db)).toEqual([]);
});

test("Donation that is cancelled should not be charged", async () => {
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
    status: ChargeStatus.Created,
  });

  expect(await getChargesToCharge(db)).toEqual([]);
});

test("Bank transfer donation should not be charged", async () => {
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
    status: ChargeStatus.Created,
  });

  expect(await getChargesToCharge(db)).toEqual([]);
});

test("Old charges in created status should *still* be charged again (until we set donation as cancelled)", async () => {
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

  const oldCharge = await insertChargeWithCreatedAt(db, {
    created_at: utc(subYears(new Date(), 2)),
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subYears(new Date(), 1)),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });

  const expected = [
    {
      id: oldCharge.id,
      amount: 100,
      email: "hello@example.com",
    },
  ];

  expect(await getChargesToCharge(db)).toMatchObject(expected);
});

test("Charges with error status should not be charged again", async () => {
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

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subYears(new Date(), 2)),
    donation_id: donation.id,
    status: ChargeStatus.Error,
  });

  expect(await getChargesToCharge(db)).toMatchObject([]);
});

test("Charges with created_at in the future should not be charged yet", async () => {
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

  await insertChargeWithCreatedAt(db, {
    created_at: utc(addDays(new Date(), 2)),
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  expect(await getChargesToCharge(db)).toMatchObject([]);
});

test("Retry charge should be charged even if original charge failed", async () => {
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

  await insertChargeWithCreatedAt(db, {
    created_at: utc(subDays(new Date(), 2)),
    donation_id: donation.id,
    status: ChargeStatus.Error,
  });

  const retry = await insertChargeWithCreatedAt(db, {
    created_at: utc(subDays(new Date(), 1)),
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  expect(await getChargesToCharge(db)).toMatchObject([
    {
      id: retry.id,
      amount: 100,
      email: "hello@example.com",
    },
  ]);
});
