import { addDays, setDate, subMonths, subYears } from "date-fns";
import {
  ChargeStatus,
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  DonationFrequency,
  DonationRecipient,
  getChargesToCharge,
  insertDonationViaBankTransfer,
  insertDonationViaQuickpay,
  insertDonationViaScanpay,
  insertDonorWithSensitiveInfo,
  insertMembershipViaQuickpay,
  PaymentMethod,
  setDonationCancelledById,
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

test("Find created charges to charge", async () => {
  const db = await client;

  // Two donors
  const donor1 = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donor2 = await insertDonorWithSensitiveInfo(db, {
    email: "world@example.com",
  });

  // ...having two donations each (3 recurring and 1 one-time)
  const donation1 = await insertDonationViaScanpay(db, {
    donor_id: donor1.id,
    amount: 100,
    recipient: DonationRecipient.MedicinModMalaria,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    tax_deductible: true,
  });

  const donation2 = await insertDonationViaScanpay(db, {
    donor_id: donor1.id,
    amount: 88,
    recipient: DonationRecipient.MyggenetModMalaria,
    frequency: DonationFrequency.Once,
    method: PaymentMethod.CreditCard,
    tax_deductible: true,
  });

  const donation3 = await insertDonationViaQuickpay(db, {
    donor_id: donor2.id,
    amount: 77,
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    tax_deductible: true,
  });

  const donation4 = await insertMembershipViaQuickpay(db, {
    donor_id: donor2.id,
    method: PaymentMethod.MobilePay,
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
      email: donor1.email,
      recipient: donation1.recipient,
      gateway: donation1.gateway,
      method: donation1.method,
    },
    {
      id: charge2.id,
      amount: donation1.amount,
      email: donor1.email,
      recipient: donation1.recipient,
      gateway: donation1.gateway,
      method: donation1.method,
    },
    {
      id: charge3.id,
      amount: donation2.amount,
      email: donor1.email,
      recipient: donation2.recipient,
      gateway: donation2.gateway,
      method: donation2.method,
    },
    {
      id: charge4.id,
      amount: donation3.amount,
      email: donor2.email,
      recipient: donation3.recipient,
      gateway: donation3.gateway,
      method: donation3.method,
    },
    {
      id: charge5.id,
      amount: donation4.amount,
      email: donor2.email,
      recipient: donation4.recipient,
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

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const _donation = await insertMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  expect(await getChargesToCharge(db)).toEqual([]);
});

test("Donation that is cancelled should not be charged", async () => {
  const db = await client;

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donation = await insertMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
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

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationViaBankTransfer(db, {
    donor_id: donor.id,
    gateway_metadata: { bank_msg: "1234" },
    amount: 88,
    recipient: DonationRecipient.MyggenetModMalaria,
    frequency: DonationFrequency.Once,
    tax_deductible: true,
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

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donation = await insertMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
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
      amount: donation.amount,
      email: donor.email,
      recipient: donation.recipient,
    },
  ];

  expect(await getChargesToCharge(db)).toMatchObject(expected);
});

test("Charges with error status should not be charged again", async () => {
  const db = await client;

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donation = await insertMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
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

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donation = await insertMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  await insertChargeWithCreatedAt(db, {
    created_at: utc(addDays(new Date(), 2)),
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  expect(await getChargesToCharge(db)).toMatchObject([]);
});
