import { _test } from "framer/helpers";
import { expect, test } from "vitest";

test("CPR validation", async () => {
  const isTaxDeductible = true;
  const isNotTaxDeductible = false;

  // Expected format: DDMMYY-XXXX
  expect(_test.isCprCvrValid(isTaxDeductible, "123456-7890")).toBe(true);

  // Invalid format (missing a dash)
  expect(_test.isCprCvrValid(isTaxDeductible, "1234567890")).toBe(false);

  // Invalid values
  expect(_test.isCprCvrValid(isTaxDeductible, "123456-78901")).toBe(false);
  expect(_test.isCprCvrValid(isTaxDeductible, "123456-789")).toBe(false);
  expect(_test.isCprCvrValid(isTaxDeductible, "")).toBe(false);

  // Validation always passes when donation is NOT tax deductible
  expect(_test.isCprCvrValid(isNotTaxDeductible, "")).toBe(true);
  expect(_test.isCprCvrValid(isNotTaxDeductible, "123456")).toBe(true);
});

test("CVR validation", async () => {
  const isTaxDeductible = true;
  const isNotTaxDeductible = false;

  // Expected format: XXXXXXXX
  expect(_test.isCprCvrValid(isTaxDeductible, "12345678")).toBe(true);

  // Invalid values
  expect(_test.isCprCvrValid(isTaxDeductible, "123456789")).toBe(false);
  expect(_test.isCprCvrValid(isTaxDeductible, "1234567")).toBe(false);
  expect(_test.isCprCvrValid(isTaxDeductible, "")).toBe(false);

  // Validation always passes when donation is NOT tax deductible
  expect(_test.isCprCvrValid(isNotTaxDeductible, "")).toBe(true);
  expect(_test.isCprCvrValid(isNotTaxDeductible, "123456")).toBe(true);
});
