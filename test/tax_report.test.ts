import { subMonths, subYears } from "date-fns";
import { PoolClient } from "pg";
import {
  ChargeStatus,
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  DonationFrequency,
  DonationRecipient,
  DonorWithSensitiveInfo,
  Gavebrev,
  GavebrevType,
  insertDonationViaQuickpay,
  insertDonorWithSensitiveInfo,
  insertGavebrev,
  insertGavebrevDonor,
  PaymentMethod,
  setGavebrevStopped,
} from "src";
import { afterEach, beforeEach, expect, test } from "vitest";
import {
  findAnnualTaxReport,
  findAnnualTaxReportOfficial,
  insertChargeWithCreatedAt,
  insertGavebrevCheckin,
  insertMaxTaxDeduction,
} from "./repository";

const client = dbClient();

beforeEach(async () => {
  const db = await client;
  await dbBeginTransaction(db);
  await setMaxTaxDeduction(db, { value: 17_000 });
});

afterEach(async () => {
  await dbRollbackTransaction(await client);
});

test("Usual donations get reported as 'A' in full, regardless of maximum tax deduction limits of ~17.000 kr. per year", async () => {
  const db = await client;

  await donate(db, { tin: "111111-1111", amount: 10_000 });
  await donate(db, { tin: "222222-2222", amount: 100_000 });
  await donate(db, { tin: "333333-3333", amount: 100_000, tax_deductible: false });

  const taxReport = await findAnnualTaxReport(db);
  expect(taxReport).toMatchObject([
    { tin: "111111-1111", ll8a_or_gavebrev: "A", total: 10_000, aconto_debt: 0 },
    { tin: "222222-2222", ll8a_or_gavebrev: "A", total: 100_000, aconto_debt: 0 },
    // 333333-3333 does not get included in the tax report
  ]);
});

test("Usual donations of the same TIN get all summed up and reported as 'A'", async () => {
  const db = await client;

  await donate(db, { tin: "111111-1111", amount: 10_000 });
  await donate(db, { tin: "111111-1111", amount: 100_000 });
  await donate(db, { tin: "111111-1111", amount: 100_000, tax_deductible: false });

  const taxReport = await findAnnualTaxReport(db);
  expect(taxReport).toMatchObject([{ tin: "111111-1111", ll8a_or_gavebrev: "A", total: 110_000, aconto_debt: 0 }]);
});

test("Gavebrev donations get reported as 'L' in full when within limits set by the gavebrev agreement", async () => {
  const db = await client;

  await gavebrev(db, { tin: "111111-1111", amount: 100_000, when_income_over: 0 });
  await gavebrev(db, { tin: "222222-2222", amount: 100_000, when_income_over: 0 });
  await gavebrev(db, { tin: "333333-3333", percentage: 10, of_income_over: 0 });
  await gavebrev(db, { tin: "444444-4444", percentage: 10, of_income_over: 0 });

  await incomeEveryone(db, { income_verified: 1_000_000 });

  await donate(db, { tin: "111111-1111", amount: 100_000 });
  await donate(db, { tin: "222222-2222", amount: 100_000, tax_deductible: false });
  await donate(db, { tin: "333333-3333", amount: 100_000 });
  await donate(db, { tin: "333333-3333", amount: 100_000, tax_deductible: false });

  const taxReport = await findAnnualTaxReport(db);
  expect(taxReport).toMatchObject([
    { tin: "111111-1111", ll8a_or_gavebrev: "L", total: 100_000, aconto_debt: 0 },
    // 222222-2222 does not get included in the tax report
    { tin: "333333-3333", ll8a_or_gavebrev: "L", total: 100_000, aconto_debt: 0 },
    // 444444-4444 does not get included in the tax report
  ]);
});

test("Gavebrev donations get reported as 'L', NOT in full, only up to a limit set by the gavebrev agreement", async () => {
  const db = await client;

  await gavebrev(db, { tin: "111111-1111", amount: 100_000, when_income_over: 0 });
  await gavebrev(db, { tin: "222222-2222", percentage: 10, of_income_over: 900_000 });

  await incomeEveryone(db, { income_verified: 1_000_000 });

  await donate(db, { tin: "111111-1111", amount: 110_000 }); // donates 10k too much
  await donate(db, { tin: "222222-2222", amount: 20_000 }); // donates 10k too much

  const taxReport = await findAnnualTaxReport(db);
  expect(taxReport).toMatchObject([
    { tin: "111111-1111", ll8a_or_gavebrev: "L", total: 100_000, aconto_debt: 10_000 }, // report max 100k
    { tin: "222222-2222", ll8a_or_gavebrev: "L", total: 10_000, aconto_debt: 10_000 }, // report max 10% of 100k
  ]);
});

test("Gavebrev donations get reported as 'L' and 'A' when asked to maximize tax deductions with the excess", async () => {
  const db = await client;

  await gavebrev(db, { tin: "111111-1111", amount: 100_000, when_income_over: 0 });
  await gavebrev(db, { tin: "222222-2222", percentage: 10, of_income_over: 900_000 });
  await gavebrev(db, { tin: "333333-3333", amount: 100_000, when_income_over: 0 });
  await gavebrev(db, { tin: "444444-4444", percentage: 10, of_income_over: 900_000 });

  await incomeEveryone(db, { income_verified: 1_000_000, maximize_tax_deduction: true });

  await donate(db, { tin: "111111-1111", amount: 110_000 }); // donates 10k too much
  await donate(db, { tin: "222222-2222", amount: 20_000 }); // donates 10k too much
  await donate(db, { tin: "333333-3333", amount: 120_000 }); // donates 20k too much
  await donate(db, { tin: "444444-4444", amount: 30_000 }); // donates 20k too much

  const taxReport = await findAnnualTaxReport(db);
  expect(taxReport).toMatchObject([
    { tin: "111111-1111", ll8a_or_gavebrev: "L", total: 100_000, aconto_debt: 0 }, // report max 100k
    { tin: "111111-1111", ll8a_or_gavebrev: "A", total: 10_000, aconto_debt: 0 }, // report the rest as normal donation
    { tin: "222222-2222", ll8a_or_gavebrev: "L", total: 10_000, aconto_debt: 0 }, // report max 10% of 100k
    { tin: "222222-2222", ll8a_or_gavebrev: "A", total: 10_000, aconto_debt: 0 }, // report the rest as normal donation
    { tin: "333333-3333", ll8a_or_gavebrev: "L", total: 100_000, aconto_debt: 3_000 }, // report max 100k, +3k aconto for next year
    { tin: "333333-3333", ll8a_or_gavebrev: "A", total: 17_000, aconto_debt: 0 }, // report up to 17k max tax deduction
    { tin: "444444-4444", ll8a_or_gavebrev: "L", total: 10_000, aconto_debt: 3_000 }, // report max 10% of 100k, +3k aconto for next year
    { tin: "444444-4444", ll8a_or_gavebrev: "A", total: 17_000, aconto_debt: 0 }, // report up to 17k max tax deduction
  ]);
});

test("Gavebrev: donating too much in the previous year does NOT give extra tax deductions in the next year", async () => {
  const db = await client;

  await gavebrev(db, { tin: "111111-1111", years_ago: 1, amount: 10_000, when_income_over: 0 });
  await gavebrev(db, { tin: "222222-2222", years_ago: 1, percentage: 10, of_income_over: 900_000 });

  await incomeEveryone(db, { income_verified: 1_000_000, years_ago: 1 });
  await incomeEveryone(db, { income_verified: 1_000_000 });

  await donate(db, { tin: "111111-1111", amount: 12_000, years_ago: 1 }); // donates 2k too much last year
  await donate(db, { tin: "222222-2222", amount: 12_000, years_ago: 1 }); // donates 2k too much last year

  await donate(db, { tin: "111111-1111", amount: 11_000 }); // donates 1k too much again this year
  await donate(db, { tin: "222222-2222", amount: 11_000 }); // donates 1k too much again this year

  const taxReport = await findAnnualTaxReport(db);
  expect(taxReport).toMatchObject([
    { tin: "111111-1111", ll8a_or_gavebrev: "L", total: 8_000, aconto_debt: 1_000 }, // report 10k minus 2k aconto, aconto does NOT accumulate
    { tin: "222222-2222", ll8a_or_gavebrev: "L", total: 8_000, aconto_debt: 1_000 }, // report 10k minus 2k aconto, aconto does NOT accumulate
  ]);
});

test("Gavebrev: donating too little in the previous years DOES give extra tax deductions in the next year, excess goes to aconto", async () => {
  const db = await client;

  await gavebrev(db, { tin: "111111-1111", years_ago: 2, amount: 10_000, when_income_over: 0 });
  await gavebrev(db, { tin: "222222-2222", years_ago: 2, percentage: 10, of_income_over: 900_000 });

  await incomeEveryone(db, { income_verified: 1_000_000, years_ago: 2 });
  await incomeEveryone(db, { income_verified: 1_000_000, years_ago: 1 });
  await incomeEveryone(db, { income_verified: 1_000_000 });

  await donate(db, { tin: "111111-1111", amount: 8_000, years_ago: 2 }); // donates 2k too little 2 years ago
  await donate(db, { tin: "222222-2222", amount: 8_000, years_ago: 2 }); // donates 2k too little 2 years ago

  await donate(db, { tin: "111111-1111", amount: 9_000, years_ago: 1 }); // donates 1k too little 1 year ago
  await donate(db, { tin: "222222-2222", amount: 9_000, years_ago: 1 }); // donates 1k too little 1 year ago

  await donate(db, { tin: "111111-1111", amount: 14_000 }); // donates all debt + 1k too much this year
  await donate(db, { tin: "222222-2222", amount: 14_000 }); // donates all debt + 1k too much this year

  const taxReport = await findAnnualTaxReport(db);
  expect(taxReport).toMatchObject([
    { tin: "111111-1111", ll8a_or_gavebrev: "L", total: 13_000, aconto_debt: 1_000 }, // report accumulated debt + max 10k for this year, but not the excess 1k
    { tin: "222222-2222", ll8a_or_gavebrev: "L", total: 13_000, aconto_debt: 1_000 }, // report accumulated debt + max 10k for this year, but not the excess 1k
  ]);
});

test("Gavebrev: donating too little in the previous years DOES give extra tax deductions in the next year, excess is reported as 'A' when asked to maximize tax deductions", async () => {
  const db = await client;

  await gavebrev(db, { tin: "111111-1111", years_ago: 2, amount: 10_000, when_income_over: 0 });
  await gavebrev(db, { tin: "222222-2222", years_ago: 2, percentage: 10, of_income_over: 900_000 });
  await gavebrev(db, { tin: "333333-3333", years_ago: 2, amount: 10_000, when_income_over: 0 });
  await gavebrev(db, { tin: "444444-4444", years_ago: 2, percentage: 10, of_income_over: 900_000 });

  await incomeEveryone(db, { income_verified: 1_000_000, years_ago: 2, maximize_tax_deduction: true });
  await incomeEveryone(db, { income_verified: 1_000_000, years_ago: 1, maximize_tax_deduction: true });
  await incomeEveryone(db, { income_verified: 1_000_000, maximize_tax_deduction: true });

  await donate(db, { tin: "111111-1111", amount: 8_000, years_ago: 2 }); // donates 2k too little 2 years ago
  await donate(db, { tin: "222222-2222", amount: 8_000, years_ago: 2 }); // donates 2k too little 2 years ago
  await donate(db, { tin: "333333-3333", amount: 8_000, years_ago: 2 }); // donates 2k too little 2 years ago
  await donate(db, { tin: "444444-4444", amount: 8_000, years_ago: 2 }); // donates 2k too little 2 years ago

  await donate(db, { tin: "111111-1111", amount: 9_000, years_ago: 1 }); // donates 1k too little 1 year ago
  await donate(db, { tin: "222222-2222", amount: 9_000, years_ago: 1 }); // donates 1k too little 1 year ago
  await donate(db, { tin: "333333-3333", amount: 9_000, years_ago: 1 }); // donates 1k too little 1 year ago
  await donate(db, { tin: "444444-4444", amount: 9_000, years_ago: 1 }); // donates 1k too little 1 year ago

  await donate(db, { tin: "111111-1111", amount: 14_000 }); // donates all debt + 1k too much this year
  await donate(db, { tin: "222222-2222", amount: 14_000 }); // donates all debt + 1k too much this year
  await donate(db, { tin: "333333-3333", amount: 33_000 }); // donates all debt + 20k too much this year
  await donate(db, { tin: "444444-4444", amount: 33_000 }); // donates all debt + 20k too much this year

  const taxReport = await findAnnualTaxReport(db);
  expect(taxReport).toMatchObject([
    { tin: "111111-1111", ll8a_or_gavebrev: "L", total: 13_000, aconto_debt: 0 }, // report accumulated debt + max 10k for this year
    { tin: "111111-1111", ll8a_or_gavebrev: "A", total: 1_000, aconto_debt: 0 }, // report the rest as normal donation
    { tin: "222222-2222", ll8a_or_gavebrev: "L", total: 13_000, aconto_debt: 0 }, // report accumulated debt + max 10k for this year
    { tin: "222222-2222", ll8a_or_gavebrev: "A", total: 1_000, aconto_debt: 0 }, // report the rest as normal donation
    { tin: "333333-3333", ll8a_or_gavebrev: "L", total: 13_000, aconto_debt: 3_000 }, // report accumulated debt + max 10k for this year
    { tin: "333333-3333", ll8a_or_gavebrev: "A", total: 17_000, aconto_debt: 0 }, // report up to 17k max tax deduction
    { tin: "444444-4444", ll8a_or_gavebrev: "L", total: 13_000, aconto_debt: 3_000 }, // report accumulated debt + max 10k for this year
    { tin: "444444-4444", ll8a_or_gavebrev: "A", total: 17_000, aconto_debt: 0 }, // report up to 17k max tax deduction
  ]);
});

test("Gavebrev can only give tax deduction for MAX 15% of the verified income, even with an accumulated debt", async () => {
  const db = await client;

  await gavebrev(db, { tin: "111111-1111", amount: 10_000, when_income_over: 0, years_ago: 1 });
  await gavebrev(db, { tin: "222222-2222", percentage: 10, of_income_over: 0, years_ago: 1 });
  await gavebrev(db, { tin: "333333-3333", amount: 10_000, when_income_over: 0, years_ago: 1 });

  await incomeEveryone(db, { income_verified: 1_000_000, years_ago: 1 });
  await incomeEveryone(db, { income_verified: 10_000 });

  await donate(db, { tin: "111111-1111", amount: 9_000, years_ago: 1 }); // donates 1k too little 1 year ago
  await donate(db, { tin: "222222-2222", amount: 99_000, years_ago: 1 }); // donates 1k too little 1 year ago
  await donate(db, { tin: "333333-3333", amount: 10_000, years_ago: 1 }); // donates as per agreement 1 year ago

  await donate(db, { tin: "111111-1111", amount: 13_000 }); // donates 1k debt + 10k as per agreement + 2k too much
  await donate(db, { tin: "222222-2222", amount: 4_000 }); // donates 1k debt + 1k as per agreement + 2k too much
  await donate(db, { tin: "333333-3333", amount: 10_000 }); // donates 10k as per agreement

  const taxReport = await findAnnualTaxReport(db);
  expect(taxReport).toMatchObject([
    { tin: "111111-1111", ll8a_or_gavebrev: "L", total: 1500, aconto_debt: 2_000 }, // report only 15% of 10k (this year's income), the diff is NOT aconto for next year
    { tin: "222222-2222", ll8a_or_gavebrev: "L", total: 1500, aconto_debt: 2_000 }, // report only 15% of 10k (this year's income), the diff is NOT aconto for next year
    { tin: "333333-3333", ll8a_or_gavebrev: "L", total: 1500, aconto_debt: 0 }, // report only 15% of 10k (this year's income), the diff is NOT aconto for next year
  ]);
});

test("Gavebrev donations above 15% of the verified income can report excess as normal donations, when asked to maximize tax deductions", async () => {
  const db = await client;

  await gavebrev(db, { tin: "111111-1111", amount: 100_000, when_income_over: 0, years_ago: 1 });
  await gavebrev(db, { tin: "222222-2222", percentage: 10, of_income_over: 0, years_ago: 1 });
  await gavebrev(db, { tin: "333333-3333", amount: 100_000, when_income_over: 0, years_ago: 1 });
  await gavebrev(db, { tin: "444444-4444", percentage: 10, of_income_over: 0, years_ago: 1 });
  await gavebrev(db, { tin: "555555-5555", amount: 10_000, when_income_over: 0, years_ago: 1 });

  await incomeEveryone(db, { income_verified: 1_000_000, years_ago: 1 });
  await incomeEveryone(db, { income_verified: 10_000, maximize_tax_deduction: true });

  await donate(db, { tin: "111111-1111", amount: 99_000, years_ago: 1 }); // donates 1k too little 1 year ago
  await donate(db, { tin: "222222-2222", amount: 99_000, years_ago: 1 }); // donates 1k too little 1 year ago
  await donate(db, { tin: "333333-3333", amount: 99_000, years_ago: 1 }); // donates 1k too little 1 year ago
  await donate(db, { tin: "444444-4444", amount: 99_000, years_ago: 1 }); // donates 1k too little 1 year ago
  await donate(db, { tin: "555555-5555", amount: 10_000, years_ago: 1 }); // donates as per agreement 1 year ago

  await donate(db, { tin: "111111-1111", amount: 121_000 }); // donates 1k debt + 100k as per agreement + 20k too much
  await donate(db, { tin: "222222-2222", amount: 22_000 }); // donates 1k debt + 1k as per agreement + 20k too much
  await donate(db, { tin: "333333-3333", amount: 111_000 }); // donates 1k debt + 100k as per agreement + 10k too much
  await donate(db, { tin: "444444-4444", amount: 12_000 }); // donates 1k debt + 1k as per agreement + 10k too much
  await donate(db, { tin: "555555-5555", amount: 10_000 }); // donates 10k as per agreement

  const taxReport = await findAnnualTaxReport(db);
  expect(taxReport).toMatchObject([
    // We can't gift tax deductions, so only the money donated on top of (their agreement + debt) can be reported as 'A' instead of aconto for the next year
    { tin: "111111-1111", ll8a_or_gavebrev: "L", total: 1_500, aconto_debt: 3_000 }, // report only 15% of 10k (this year's income), the diff is NOT aconto for next year
    { tin: "111111-1111", ll8a_or_gavebrev: "A", total: 17_000, aconto_debt: 0 }, // report up to 17k max tax deduction
    { tin: "222222-2222", ll8a_or_gavebrev: "L", total: 1_500, aconto_debt: 3_000 }, // report only 15% of 10k (this year's income), the diff is NOT aconto for next year
    { tin: "222222-2222", ll8a_or_gavebrev: "A", total: 17_000, aconto_debt: 0 }, // report up to 17k max tax deduction
    { tin: "333333-3333", ll8a_or_gavebrev: "L", total: 1_500, aconto_debt: 0 }, // report only 15% of 10k (this year's income), the diff is NOT aconto for next year
    { tin: "333333-3333", ll8a_or_gavebrev: "A", total: 10_000, aconto_debt: 0 }, // report up to 17k max tax deduction
    { tin: "444444-4444", ll8a_or_gavebrev: "L", total: 1_500, aconto_debt: 0 }, // report only 15% of 10k (this year's income), the diff is NOT aconto for next year
    { tin: "444444-4444", ll8a_or_gavebrev: "A", total: 10_000, aconto_debt: 0 }, // report up to 17k max tax deduction
    { tin: "555555-5555", ll8a_or_gavebrev: "L", total: 1_500, aconto_debt: 0 }, // report only 15% of 10k (this year's income), the diff is NOT aconto for next year
  ]);
});

test("Donations for a person having multiple gavebrev get all summed up and reported as 'L'", async () => {
  const db = await client;

  await gavebrev(db, { tin: "111111-1111", amount: 10_000, when_income_over: 0, years_ago: 2 });
  await gavebrev(db, { tin: "111111-1111", amount: 10_000, when_income_over: 0, years_ago: 1 });
  await gavebrev(db, { tin: "111111-1111", amount: 10_000, when_income_over: 0 });

  await incomeEveryone(db, { income_verified: 1_000_000, years_ago: 2 });
  await incomeEveryone(db, { income_verified: 1_000_000, years_ago: 1 });
  await incomeEveryone(db, { income_verified: 1_000_000 });

  await donate(db, { tin: "111111-1111", amount: 5_000, years_ago: 2 }); // donates 5k too little in the first year
  await donate(db, { tin: "111111-1111", amount: 5_000, years_ago: 1 }); // donates 15k too little in the second year
  await donate(db, { tin: "111111-1111", amount: 70_000 }); // donates all 20k debt + 30k for this year + 20k too much

  const taxReport = await findAnnualTaxReport(db);
  expect(taxReport).toMatchObject([
    { tin: "111111-1111", ll8a_or_gavebrev: "L", total: 50_000, aconto_debt: 20_000 }, // report 20k debt + 30k as per all agreements, but not the excess 20k
  ]);
});

test("Excess for donations for a person having multiple gavebrev is reported as 'A', when asked to maximize tax deductions", async () => {
  const db = await client;

  await gavebrev(db, { tin: "111111-1111", amount: 10_000, when_income_over: 0, years_ago: 2 });
  await gavebrev(db, { tin: "222222-2222", amount: 10_000, when_income_over: 0, years_ago: 2 });
  await gavebrev(db, { tin: "111111-1111", amount: 10_000, when_income_over: 0, years_ago: 1 });
  await gavebrev(db, { tin: "222222-2222", amount: 10_000, when_income_over: 0, years_ago: 1 });
  await gavebrev(db, { tin: "111111-1111", amount: 10_000, when_income_over: 0 });
  await gavebrev(db, { tin: "222222-2222", amount: 10_000, when_income_over: 0 });

  await incomeEveryone(db, { income_verified: 1_000_000, years_ago: 2, maximize_tax_deduction: true });
  await incomeEveryone(db, { income_verified: 1_000_000, years_ago: 1, maximize_tax_deduction: true });
  await incomeEveryone(db, { income_verified: 1_000_000, maximize_tax_deduction: true });

  await donate(db, { tin: "111111-1111", amount: 5_000, years_ago: 2 }); // donates 5k too little in the first year
  await donate(db, { tin: "222222-2222", amount: 5_000, years_ago: 2 }); // donates 5k too little in the first year
  await donate(db, { tin: "111111-1111", amount: 5_000, years_ago: 1 }); // donates 15k too little in the second year
  await donate(db, { tin: "222222-2222", amount: 5_000, years_ago: 1 }); // donates 15k too little in the second year
  await donate(db, { tin: "111111-1111", amount: 70_000 }); // donates all 20k debt + 30k for this year + 20k too much
  await donate(db, { tin: "222222-2222", amount: 60_000 }); // donates all 20k debt + 30k for this year + 10k too much

  const taxReport = await findAnnualTaxReport(db);
  expect(taxReport).toMatchObject([
    { tin: "111111-1111", ll8a_or_gavebrev: "L", total: 50_000, aconto_debt: 3_000 }, // report 20k debt + 30k as per all agreements
    { tin: "111111-1111", ll8a_or_gavebrev: "A", total: 17_000, aconto_debt: 0 }, // report up to 17k max tax deduction
    { tin: "222222-2222", ll8a_or_gavebrev: "L", total: 50_000, aconto_debt: 0 }, // report 20k debt + 30k as per all agreements
    { tin: "222222-2222", ll8a_or_gavebrev: "A", total: 10_000, aconto_debt: 0 }, // report up to 17k max tax deduction
  ]);
});

test("Multiple gavebrev can still only give tax deduction for MAX 15% of the verified income", async () => {
  const db = await client;

  await gavebrev(db, { tin: "111111-1111", amount: 10_000, when_income_over: 0, years_ago: 1 });
  await gavebrev(db, { tin: "111111-1111", amount: 10_000, when_income_over: 0 });

  await incomeEveryone(db, { income_verified: 100_000, years_ago: 1 });
  await incomeEveryone(db, { income_verified: 100_000 });

  await donate(db, { tin: "111111-1111", amount: 10_000, years_ago: 1 }); // donates 10k as per the agreement
  await donate(db, { tin: "111111-1111", amount: 22_000 }); // donates 20k as per the two agreements + 2k too much

  const taxReport = await findAnnualTaxReport(db);
  expect(taxReport).toMatchObject([
    { tin: "111111-1111", ll8a_or_gavebrev: "L", total: 15_000, aconto_debt: 2_000 }, // report only 15% of 100k (this year's income), the diff is NOT aconto for next year
  ]);
});

test("Excess for donations for a person having multiple gavebrev over 15% of the verified income is reported as 'A', when asked to maximize tax deductions", async () => {
  const db = await client;

  await gavebrev(db, { tin: "111111-1111", amount: 10_000, when_income_over: 0, years_ago: 1 });
  await gavebrev(db, { tin: "222222-2222", amount: 10_000, when_income_over: 0, years_ago: 1 });
  await gavebrev(db, { tin: "111111-1111", amount: 10_000, when_income_over: 0 });
  await gavebrev(db, { tin: "222222-2222", amount: 10_000, when_income_over: 0 });

  await incomeEveryone(db, { income_verified: 100_000, years_ago: 1, maximize_tax_deduction: true });
  await incomeEveryone(db, { income_verified: 100_000, maximize_tax_deduction: true });

  await donate(db, { tin: "111111-1111", amount: 10_000, years_ago: 1 }); // donates 10k as per the agreement
  await donate(db, { tin: "222222-2222", amount: 10_000, years_ago: 1 }); // donates 10k as per the agreement
  await donate(db, { tin: "111111-1111", amount: 40_000 }); // donates 20k as per the two agreements + 20k too much
  await donate(db, { tin: "222222-2222", amount: 22_000 }); // donates 20k as per the two agreements + 2k too much

  const taxReport = await findAnnualTaxReport(db);
  expect(taxReport).toMatchObject([
    { tin: "111111-1111", ll8a_or_gavebrev: "L", total: 15_000, aconto_debt: 3_000 }, // report only 15% of 100k (this year's income), the diff is NOT aconto for next year
    { tin: "111111-1111", ll8a_or_gavebrev: "A", total: 17_000, aconto_debt: 0 }, // report up to 17k max tax deduction
    { tin: "222222-2222", ll8a_or_gavebrev: "L", total: 15_000, aconto_debt: 0 }, // report only 15% of 100k (this year's income), the diff is NOT aconto for next year
    { tin: "222222-2222", ll8a_or_gavebrev: "A", total: 2_000, aconto_debt: 0 }, // report up to 17k max tax deduction
  ]);
});

test("Gavebrev donations respect different tax deduction limits in different years", async () => {
  const db = await client;

  await gavebrev(db, { tin: "111111-1111", amount: 100_000, when_income_over: 0, years_ago: 1 });
  await gavebrev(db, { tin: "222222-2222", percentage: 10, of_income_over: 900_000, years_ago: 1 });

  await incomeEveryone(db, { income_verified: 1_000_000, maximize_tax_deduction: true, years_ago: 1 });
  await incomeEveryone(db, { income_verified: 1_000_000, maximize_tax_deduction: true });

  // set different tax deduction in a previous year
  await setMaxTaxDeduction(db, { value: 16_000, years_ago: 1 });

  await donate(db, { tin: "111111-1111", amount: 120_000, years_ago: 1 }); // donates 20k too much
  await donate(db, { tin: "222222-2222", amount: 30_000, years_ago: 1 }); // donates 20k too much
  await donate(db, { tin: "111111-1111", amount: 120_000 }); // donates 20k too much
  await donate(db, { tin: "222222-2222", amount: 30_000 }); // donates 20k too much

  const taxReport = await findAnnualTaxReport(db);
  expect(taxReport).toMatchObject([
    { tin: "111111-1111", ll8a_or_gavebrev: "L", total: 96_000, aconto_debt: 3_000 }, // report max 100k - 4k aconto from last year
    { tin: "111111-1111", ll8a_or_gavebrev: "A", total: 17_000, aconto_debt: 0 }, // report up to 17k max tax deduction
    { tin: "222222-2222", ll8a_or_gavebrev: "L", total: 6_000, aconto_debt: 3_000 }, // report max 10% of 100k - 4k aconto from last year
    { tin: "222222-2222", ll8a_or_gavebrev: "A", total: 17_000, aconto_debt: 0 }, // report up to 17k max tax deduction
  ]);
});

test("Having a stopped gavebrev does not affect reporting usual donations as 'A'", async () => {
  const db = await client;

  const g = await gavebrev(db, { tin: "111111-1111", amount: 100_000, when_income_over: 0, years_ago: 1 });
  await setGavebrevStopped(db, g.id, new Date(Date.UTC(getYear(0), 0, 1)));

  await incomeEveryone(db, { income_verified: 1_000_000 });

  await donate(db, { tin: "111111-1111", amount: 100_000 });

  const taxReport = await findAnnualTaxReport(db);
  expect(taxReport).toMatchObject([{ tin: "111111-1111", ll8a_or_gavebrev: "A", total: 100_000, aconto_debt: 0 }]);
});

test("Gavebrev donations don't get reported when gavebrev conditions are not met, but go to aconto", async () => {
  const db = await client;

  await gavebrev(db, { tin: "111111-1111", amount: 100_000, when_income_over: 1_000_000 });
  await gavebrev(db, { tin: "222222-2222", percentage: 10, of_income_over: 1_000_000 });

  await incomeEveryone(db, { income_verified: 1_000_000 });

  await donate(db, { tin: "111111-1111", amount: 100_000 }); // donates 100k but gavebrev conditions are not fulfilled in this year
  await donate(db, { tin: "222222-2222", amount: 100_000 }); // donates 100k but gavebrev conditions are not fulfilled in this year

  const taxReport = await findAnnualTaxReport(db);
  expect(taxReport).toMatchObject([
    { tin: "111111-1111", ll8a_or_gavebrev: "L", total: 0, aconto_debt: 100_000 }, // nothing is reported, donations go to aconto
    { tin: "222222-2222", ll8a_or_gavebrev: "L", total: 0, aconto_debt: 100_000 }, // nothing is reported, donations go to aconto
  ]);
});

test("Gavebrev donations get reported 'A' when gavebrev conditions are not met and when asked to maximize tax deductions with the excess", async () => {
  const db = await client;

  await gavebrev(db, { tin: "111111-1111", amount: 100_000, when_income_over: 1_000_000 });
  await gavebrev(db, { tin: "222222-2222", percentage: 10, of_income_over: 1_000_000 });

  await incomeEveryone(db, { income_verified: 1_000_000, maximize_tax_deduction: true });

  await donate(db, { tin: "111111-1111", amount: 100_000 }); // donates 100k but gavebrev conditions are not fulfilled in this year
  await donate(db, { tin: "222222-2222", amount: 100_000 }); // donates 100k but gavebrev conditions are not fulfilled in this year

  const taxReport = await findAnnualTaxReport(db);
  expect(taxReport).toMatchObject([
    { tin: "111111-1111", ll8a_or_gavebrev: "L", total: 0, aconto_debt: 83_000 }, // nothing is reported, excess above 'A' goes to aconto
    { tin: "111111-1111", ll8a_or_gavebrev: "A", total: 17_000, aconto_debt: 0 }, // gets max deduction for usual donations that year
    { tin: "222222-2222", ll8a_or_gavebrev: "L", total: 0, aconto_debt: 83_000 }, // nothing is reported, excess above 'A' goes to aconto
    { tin: "222222-2222", ll8a_or_gavebrev: "A", total: 17_000, aconto_debt: 0 }, // gets max deduction for usual donations that year
  ]);
});

test("Gavebrev with missing income report is processed as if income is zero", async () => {
  const db = await client;

  await gavebrev(db, { tin: "111111-1111", amount: 10_000, when_income_over: 0 });
  await gavebrev(db, { tin: "222222-2222", percentage: 10, of_income_over: 0 });

  // No income checkin

  await donate(db, { tin: "111111-1111", amount: 20_000 }); // gavebrev conditions are not fulfilled since income is zero
  await donate(db, { tin: "222222-2222", amount: 20_000 }); // gavebrev conditions are not fulfilled since income is zero

  const taxReport = await findAnnualTaxReport(db);
  expect(taxReport).toMatchObject([
    { tin: "111111-1111", ll8a_or_gavebrev: "L", total: 0, aconto_debt: 20_000 }, // nothing is reported, donations go to aconto
    { tin: "222222-2222", ll8a_or_gavebrev: "L", total: 0, aconto_debt: 20_000 }, // nothing is reported, donations go to aconto
  ]);
});

test("Official tax report contains all the necessary fields in the expected format", async () => {
  const db = await client;

  await gavebrev(db, { tin: "111111-1111", amount: 99_000, when_income_over: 0 });
  await gavebrev(db, { tin: "222222-2222", percentage: 10, of_income_over: 900_000 });

  await incomeEveryone(db, { income_verified: 1_000_000, maximize_tax_deduction: true });

  await donate(db, { tin: "111111-1111", amount: 109_000 });
  await donate(db, { tin: "222222-2222", amount: 20_000 });
  await donate(db, { tin: "333333-3333", amount: 20_000 });

  const year = getYear();
  const taxReport = await findAnnualTaxReportOfficial(db);
  expect(taxReport).toMatchObject([
    { donor_cpr: "1111111111", ll8a_or_gavebrev: "L", total: 99_000, year, const: 2262, blank: "", ge_cvr: 42490903, ge_notes: "", rettekode: 0 },
    { donor_cpr: "1111111111", ll8a_or_gavebrev: "A", total: 10_000, year, const: 2262, blank: "", ge_cvr: 42490903, ge_notes: "", rettekode: 0 },
    { donor_cpr: "2222222222", ll8a_or_gavebrev: "L", total: 10_000, year, const: 2262, blank: "", ge_cvr: 42490903, ge_notes: "", rettekode: 0 },
    { donor_cpr: "2222222222", ll8a_or_gavebrev: "A", total: 10_000, year, const: 2262, blank: "", ge_cvr: 42490903, ge_notes: "", rettekode: 0 },
    { donor_cpr: "3333333333", ll8a_or_gavebrev: "A", total: 20_000, year, const: 2262, blank: "", ge_cvr: 42490903, ge_notes: "", rettekode: 0 },
  ]);
});

type donateArgs = {
  tin: string;
  amount: number;
  tax_deductible?: boolean;
  years_ago?: number;
};

const donate = async (db: PoolClient, { tin, amount, tax_deductible = true, years_ago = 0 }: donateArgs) => {
  const random = (Math.random() + 1).toString(36).substring(7);

  const donor = await insertDonorWithSensitiveInfo(db, {
    email: `${random}@example.com`,
    tin,
  });

  const donation = await insertDonationViaQuickpay(db, {
    donor_id: donor.id,
    amount,
    recipient: DonationRecipient.GivEffektivtsAnbefaling,
    frequency: DonationFrequency.Once,
    method: PaymentMethod.CreditCard,
    tax_deductible,
  });

  await insertChargeWithCreatedAt(db, {
    created_at: getDate(years_ago),
    donation_id: donation.id,
    status: ChargeStatus.Charged,
  });
};

type gavebrevArgs = {
  tin: string;
  amount?: number;
  percentage?: number;
  years_ago?: number;
  when_income_over?: number;
  of_income_over?: number;
};

const gavebrev = async (
  db: PoolClient,
  { tin, amount, percentage, years_ago = 0, when_income_over, of_income_over }: gavebrevArgs
): Promise<Gavebrev> => {
  const startYear = getYear(years_ago);

  const donor = await gavebrevDonor(db, tin);

  if (amount) {
    return await insertGavebrev(db, {
      donor_id: donor.id,
      type: GavebrevType.Amount,
      amount,
      minimal_income: when_income_over,
      started_at: new Date(Date.UTC(startYear, 0, 1)),
      stopped_at: new Date(Date.UTC(startYear + 10, 0, 1)),
    });
  } else if (percentage) {
    return await insertGavebrev(db, {
      donor_id: donor.id,
      type: GavebrevType.Percentage,
      amount: percentage,
      minimal_income: of_income_over,
      started_at: new Date(Date.UTC(startYear, 0, 1)),
      stopped_at: new Date(Date.UTC(startYear + 10, 0, 1)),
    });
  } else {
    throw Error("Unable to create gavebrev: amount or percentage is required");
  }
};

type incomeEveryoneArgs = {
  income_verified?: number;
  years_ago?: number;
  maximize_tax_deduction?: boolean;
};

const incomeEveryone = async (db: PoolClient, { income_verified = 1_000_000, years_ago = 0, maximize_tax_deduction = false }: incomeEveryoneArgs) => {
  for (let i = 1; i <= 10; i++) {
    const tin = `${i}`.repeat(6) + "-" + `${i}`.repeat(4);

    const donor = await gavebrevDonor(db, tin);

    await insertGavebrevCheckin(db, {
      donor_id: donor.id,
      year: getYear(years_ago),
      income_verified,
      maximize_tax_deduction,
    });
  }
};

type maxTaxDeductionArgs = {
  value?: number;
  years_ago?: number;
};

const setMaxTaxDeduction = async (db: PoolClient, { value = 0, years_ago = 0 }: maxTaxDeductionArgs) => {
  await insertMaxTaxDeduction(db, getYear(years_ago), value);
};

const gavebrevDonor = async (db: PoolClient, tin: string): Promise<DonorWithSensitiveInfo> => {
  const random = (Math.random() + 1).toString(36).substring(7);
  return await insertGavebrevDonor(db, {
    name: "John Smith",
    email: `${random}@example.com`,
    tin,
  });
};

const getDate = (years_ago = 0) => subYears(subMonths(new Date(), 6), years_ago);

const getYear = (years_ago = 0) => getDate(years_ago).getFullYear();
