import moment from "moment";
import {
  ChargeStatus,
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  DonationFrequency,
  DonationRecipient,
  getChargesToCharge,
  insertDonationMembershipViaBankTransfer,
  insertDonationMembershipViaScanpay,
  insertDonationViaScanpay,
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
  const donation1 = await insertDonationMembershipViaScanpay(db, {
    donor_id: donor1.id,
    method: PaymentMethod.CreditCard,
  });

  const donation2 = await insertDonationViaScanpay(db, {
    donor_id: donor1.id,
    amount: 88,
    recipient: DonationRecipient.MyggenetModMalaria,
    frequency: DonationFrequency.Once,
    method: PaymentMethod.CreditCard,
    tax_deductible: true,
  });

  const donation3 = await insertDonationViaScanpay(db, {
    donor_id: donor2.id,
    amount: 77,
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    tax_deductible: true,
  });

  const donation4 = await insertDonationMembershipViaScanpay(db, {
    donor_id: donor2.id,
    method: PaymentMethod.MobilePay,
  });

  const now = moment().set("date", 3);

  // ...each not charged yet
  const charge1 = await insertCharge(db, {
    created_at: now.clone().add(-3, "year").toDate(),
    donation_id: donation1.id,
    status: ChargeStatus.Created,
  });
  const charge2 = await insertCharge(db, {
    created_at: now.clone().add(-2, "year").toDate(),
    donation_id: donation1.id,
    status: ChargeStatus.Created,
  });
  const charge3 = await insertCharge(db, {
    created_at: now.clone().add(-1, "month").toDate(),
    donation_id: donation2.id,
    status: ChargeStatus.Created,
  });
  const charge4 = await insertCharge(db, {
    created_at: now.clone().add(-1, "month").toDate(),
    donation_id: donation3.id,
    status: ChargeStatus.Created,
  });
  const charge5 = await insertCharge(db, {
    created_at: now.clone().add(-1, "year").toDate(),
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
    },
    {
      id: charge2.id,
      amount: donation1.amount,
      email: donor1.email,
      recipient: donation1.recipient,
    },
    {
      id: charge3.id,
      amount: donation2.amount,
      email: donor1.email,
      recipient: donation2.recipient,
    },
    {
      id: charge4.id,
      amount: donation3.amount,
      email: donor2.email,
      recipient: donation3.recipient,
    },
    {
      id: charge5.id,
      amount: donation4.amount,
      email: donor2.email,
      recipient: donation4.recipient,
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

  const _donation = await insertDonationMembershipViaScanpay(db, {
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

  const donation = await insertDonationMembershipViaScanpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  await setDonationCancelled(db, donation);

  await insertCharge(db, {
    created_at: moment().add(-2, "year").toDate(),
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

  const donation = await insertDonationMembershipViaBankTransfer(db, {
    donor_id: donor.id,
    gateway_metadata: { bank_msg: "1234" },
  });

  await insertCharge(db, {
    created_at: moment().add(-2, "year").toDate(),
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

  const donation = await insertDonationMembershipViaScanpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  const oldCharge = await insertCharge(db, {
    created_at: moment().add(-2, "year").toDate(),
    donation_id: donation.id,
    status: ChargeStatus.Created,
  });

  await insertCharge(db, {
    created_at: moment().add(-1, "year").toDate(),
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

  const donation = await insertDonationMembershipViaScanpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  await insertCharge(db, {
    created_at: moment().add(-2, "year").toDate(),
    donation_id: donation.id,
    status: ChargeStatus.Error,
  });

  expect(await getChargesToCharge(db)).toMatchObject([]);
});
