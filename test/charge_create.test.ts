import moment from "moment";
import {
  ChargeStatus,
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  DonationFrequency,
  DonationRecipient,
  insertChargesForDonationsToCreateCharges,
  insertDonationMembershipViaBankTransfer,
  insertDonationMembershipViaScanPay,
  insertDonationViaScanPay,
  insertDonorWithSensitiveInfo,
  PaymentMethod,
} from "src";
import { afterEach, beforeEach, expect, test } from "vitest";
import { insertCharge, setDonationCancelled } from "./repository";

const client = dbClient();

beforeEach(async () => {
  await dbBeginTransaction(await client);
});

afterEach(async () => {
  await dbRollbackTransaction(await client);
});

test("Insert charges for donations that need new charges", async () => {
  const db = await client;

  // Two donors
  const donor1 = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donor2 = await insertDonorWithSensitiveInfo(db, {
    email: "world@example.com",
  });

  // ...having two donations each (3 recurring and 1 one-time)
  const donation1 = await insertDonationMembershipViaScanPay(db, {
    donor_id: donor1.id,
    method: PaymentMethod.CreditCard,
  });

  const donation2 = await insertDonationViaScanPay(db, {
    donor_id: donor1.id,
    amount: 88,
    recipient: DonationRecipient.MyggenetModMalaria,
    frequency: DonationFrequency.Once,
    method: PaymentMethod.CreditCard,
    tax_deductible: true,
  });

  const donation3 = await insertDonationViaScanPay(db, {
    donor_id: donor2.id,
    amount: 77,
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    tax_deductible: true,
  });

  const donation4 = await insertDonationMembershipViaScanPay(db, {
    donor_id: donor2.id,
    method: PaymentMethod.MobilePay,
  });

  const now = moment().set("date", 3);

  // ...each successfully charged in the past
  await insertCharge(db, {
    created_at: now.clone().add(-3, "year").toDate(),
    donation_id: donation1.id,
    status: ChargeStatus.Charged,
  });

  await insertCharge(db, {
    created_at: now.clone().add(-2, "year").toDate(),
    donation_id: donation1.id,
    status: ChargeStatus.Charged,
  });

  await insertCharge(db, {
    created_at: now.clone().add(-1, "month").toDate(),
    donation_id: donation2.id,
    status: ChargeStatus.Charged,
  });

  await insertCharge(db, {
    created_at: now.clone().add(-1, "month").toDate(),
    donation_id: donation3.id,
    status: ChargeStatus.Charged,
  });

  await insertCharge(db, {
    created_at: now.clone().add(-1, "year").toDate(),
    donation_id: donation4.id,
    status: ChargeStatus.Charged,
  });

  const newCharges = await insertChargesForDonationsToCreateCharges(db);

  const expected = [
    {
      donation_id: donation1.id,
      created_at: now.clone().add(-1, "year").toDate(),
      status: ChargeStatus.Created,
    },
    {
      donation_id: donation3.id,
      created_at: now.clone().toDate(),
      status: ChargeStatus.Created,
    },
    {
      donation_id: donation4.id,
      created_at: now.clone().toDate(),
      status: ChargeStatus.Created,
    },
  ];

  newCharges.sort((a, b) => a.donation_id.localeCompare(b.donation_id));
  expected.sort((a, b) => a.donation_id.localeCompare(b.donation_id));

  expect(newCharges).toMatchObject(expected);
});

test("Donation that has no charges should not have new charges created", async () => {
  const db = await client;

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const _donation = await insertDonationMembershipViaScanPay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  expect(await insertChargesForDonationsToCreateCharges(db)).toEqual([]);
});

test("Donation that is cancelled should not have new charges created", async () => {
  const db = await client;

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationMembershipViaScanPay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  await setDonationCancelled(db, donation);

  await insertCharge(db, {
    created_at: moment().add(-2, "year").toDate(),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });

  expect(await insertChargesForDonationsToCreateCharges(db)).toEqual([]);
});

test("Bank transfer donation should not have new charges created", async () => {
  const db = await client;

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationMembershipViaBankTransfer(db, {
    donor_id: donor.id,
    gateway_metadata: { bank_msg: "1234" },
  });

  await insertCharge(db, {
    created_at: moment().add(-2, "year").toDate(),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });

  expect(await insertChargesForDonationsToCreateCharges(db)).toEqual([]);
});

test("Active donation whose past charge was unsuccessful should *still* have new charges created (until we set it as cancelled)", async () => {
  const db = await client;

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
  });

  const donation = await insertDonationMembershipViaScanPay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  const now = moment().set("date", 3);

  await insertCharge(db, {
    created_at: now.clone().add(-2, "year").toDate(),
    donation_id: donation.id,
    status: ChargeStatus.Error,
  });

  const expected = [
    {
      donation_id: donation.id,
      created_at: now.clone().add(-1, "year").toDate(),
      status: ChargeStatus.Created,
    },
  ];

  expect(await insertChargesForDonationsToCreateCharges(db)).toMatchObject(
    expected
  );
});
