import { setDate, subMonths, subYears } from "date-fns";
import { utc } from "./helpers";
import {
  ChargeStatus,
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  DonationFrequency,
  DonationRecipient,
  EmailedStatus,
  insertDonorWithSensitiveInfo,
  insertMembershipViaQuickpay,
  insertQuickpayDataDonation,
  insertQuickpayDataMembership,
  PaymentGateway,
  PaymentMethod,
  recreateQuickpayRecurringDonation,
  setDonationQuickpayId,
} from "src";
import { afterEach, beforeEach, expect, test } from "vitest";
import {
  findAllCharges,
  findAllDonations,
  findAllDonors,
  insertChargeWithCreatedAt,
} from "./repository";

const client = dbClient();

beforeEach(async () => {
  await dbBeginTransaction(await client);
});

afterEach(async () => {
  await dbRollbackTransaction(await client);
});

test("One-time donation using Quickpay", async () => {
  const db = await client;

  await insertQuickpayDataDonation(db, {
    amount: 10,
    email: "hello@example.com",
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    frequency: DonationFrequency.Once,
    method: PaymentMethod.MobilePay,
    tin: undefined,
    taxDeductible: false,
    subscribeToNewsletter: false,
  });

  const donors = await findAllDonors(db);
  expect(donors).toMatchObject([
    {
      email: "hello@example.com",
    },
  ]);

  const donations = await findAllDonations(db);
  expect(donations).toMatchObject([
    {
      amount: 10,
      cancelled: false,
      donor_id: donors[0].id,
      emailed: EmailedStatus.No,
      frequency: DonationFrequency.Once,
      gateway: PaymentGateway.Quickpay,
      method: PaymentMethod.MobilePay,
      recipient: DonationRecipient.VitaminModMangelsygdomme,
      tax_deductible: false,
    },
  ]);

  const charges = await findAllCharges(db);
  expect(charges).toMatchObject([
    {
      donation_id: donations[0].id,
      status: ChargeStatus.Waiting,
    },
  ]);
});

test("Monthly donation using Quickpay", async () => {
  const db = await client;

  await insertQuickpayDataDonation(db, {
    amount: 10,
    email: "hello@example.com",
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    tin: "222222-2222",
    taxDeductible: false,
    subscribeToNewsletter: false,
  });

  const donors = await findAllDonors(db);
  expect(donors).toMatchObject([
    {
      email: "hello@example.com",
      tin: "222222-2222",
    },
  ]);

  const donations = await findAllDonations(db);
  expect(donations).toMatchObject([
    {
      amount: 10,
      cancelled: false,
      donor_id: donors[0].id,
      emailed: EmailedStatus.No,
      frequency: DonationFrequency.Monthly,
      gateway: PaymentGateway.Quickpay,
      method: PaymentMethod.CreditCard,
      recipient: DonationRecipient.VitaminModMangelsygdomme,
      tax_deductible: false,
    },
  ]);

  const charges = await findAllCharges(db);
  expect(charges).toHaveLength(0);
});

test("Membership using Quickpay", async () => {
  const db = await client;

  await insertQuickpayDataMembership(db, {
    email: "hello@example.com",
    tin: "111111-1111",
    name: "John Smith",
    address: "Some street",
    city: "Copenhagen",
    country: "Denmark",
    postcode: "1234",
  });

  const donors = await findAllDonors(db);
  expect(donors).toMatchObject([
    {
      email: "hello@example.com",
      tin: "111111-1111",
      name: "John Smith",
      address: "Some street",
      city: "Copenhagen",
      postcode: "1234",
      country: "Denmark",
    },
  ]);

  const donations = await findAllDonations(db);
  expect(donations).toMatchObject([
    {
      amount: 50,
      cancelled: false,
      donor_id: donors[0].id,
      emailed: EmailedStatus.No,
      frequency: DonationFrequency.Yearly,
      gateway: PaymentGateway.Quickpay,
      method: PaymentMethod.CreditCard,
      recipient: DonationRecipient.GivEffektivt,
      tax_deductible: false,
    },
  ]);

  const charges = await findAllCharges(db);
  expect(charges).toHaveLength(0);
});

test("Add quickpay_id while preserving quickpay_order on the donation", async () => {
  const db = await client;

  await insertQuickpayDataDonation(db, {
    amount: 10,
    email: "hello@example.com",
    recipient: DonationRecipient.VitaminModMangelsygdomme,
    frequency: DonationFrequency.Monthly,
    method: PaymentMethod.CreditCard,
    tin: "111111-1111",
    taxDeductible: true,
    subscribeToNewsletter: false,
  });

  const insertedDonations = await findAllDonations(db);
  expect(insertedDonations).toHaveLength(1);

  const insertedDonation = insertedDonations[0];
  const quickpayOrder = insertedDonation.gateway_metadata.quickpay_order;
  expect(quickpayOrder).toHaveLength(4);

  const quickpayId = "some-id";
  insertedDonation.gateway_metadata.quickpay_id = quickpayId;
  await setDonationQuickpayId(db, insertedDonation);

  const donors = await findAllDonors(db);
  const donations = await findAllDonations(db);
  donations.sort((a, b) => a.amount - b.amount);
  expect(donations).toMatchObject([
    {
      amount: 10,
      cancelled: false,
      donor_id: donors[0].id,
      emailed: EmailedStatus.No,
      frequency: DonationFrequency.Monthly,
      gateway: PaymentGateway.Quickpay,
      method: PaymentMethod.CreditCard,
      recipient: DonationRecipient.VitaminModMangelsygdomme,
      tax_deductible: true,
      gateway_metadata: {
        quickpay_id: quickpayId,
        quickpay_order: quickpayOrder,
      },
    },
  ]);

  const charges = await findAllCharges(db);
  expect(charges).toHaveLength(0);
});

test("Recreate failed recurring donation", async () => {
  const db = await client;

  const now = setDate(new Date(), 1);

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: "hello@example.com",
    name: "John Smith",
  });

  // Membership that was successful first time, but failed on a second charge
  const donation = await insertMembershipViaQuickpay(db, {
    donor_id: donor.id,
    method: PaymentMethod.CreditCard,
  });

  const successfulCharge = await insertChargeWithCreatedAt(db, {
    created_at: utc(subYears(now, 3)),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });

  const failedCharge = await insertChargeWithCreatedAt(db, {
    created_at: utc(subYears(now, 2)),
    donation_id: donation.id,
    status: ChargeStatus.Error,
  });

  const recreated = await recreateQuickpayRecurringDonation(db, {
    donor_id: donor.id,
    donor_name: donor.name,
    donor_email: donor.email,
    donation_id: donation.id,
    amount: donation.amount,
    recipient: donation.recipient,
    frequency: donation.frequency,
    tax_deductible: donation.tax_deductible,
    method: donation.method,
    failed_at: failedCharge.created_at,
  });

  const donors = await findAllDonors(db);
  expect(donors).toEqual([donor]);

  const donations = await findAllDonations(db);
  const expectedDonations = [
    {
      id: donation.id,
      donor_id: donation.donor_id,
      emailed: donation.emailed,
      amount: donation.amount,
      recipient: donation.recipient,
      frequency: donation.frequency,
      cancelled: true,
      gateway: donation.gateway,
      method: donation.method,
      tax_deductible: donation.tax_deductible,
      created_at: donation.created_at,
      updated_at: donation.updated_at,
    },
    {
      id: recreated.id,
      donor_id: donation.donor_id,
      emailed: EmailedStatus.Yes,
      amount: donation.amount,
      recipient: donation.recipient,
      frequency: donation.frequency,
      cancelled: false,
      gateway: donation.gateway,
      method: donation.method,
      tax_deductible: donation.tax_deductible,
      created_at: donation.created_at,
      updated_at: donation.updated_at,
    },
  ];

  donations.sort((a, b) =>
    a.cancelled === b.cancelled ? 0 : a.cancelled ? -1 : 1,
  );
  expectedDonations.sort((a, b) =>
    a.cancelled === b.cancelled ? 0 : a.cancelled ? -1 : 1,
  );

  expect(donations).toMatchObject(expectedDonations);

  const charges = await findAllCharges(db);
  const expectedCharges = [
    {
      id: successfulCharge.id,
      donation_id: donation.id,
      short_id: successfulCharge.short_id,
      status: successfulCharge.status,
    },
    {
      id: failedCharge.id,
      donation_id: donation.id,
      short_id: failedCharge.short_id,
      status: failedCharge.status,
    },
  ];
  expect(charges).toMatchObject(expectedCharges);
});
