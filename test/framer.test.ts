import { _test } from "framer/helpers-donation";
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

test("CPR plausability", async () => {
  // Non-digits
  expect(_test.isCprCvrPlausible("aaaaaa-aaaa")).toBe(false);

  // Modulus11 mismatch
  expect(_test.isCprCvrPlausible("111111-1111")).toBe(false);

  // Invalid date portion
  expect(_test.isCprCvrPlausible("999999-9996")).toBe(false);

  // Valid
  expect(_test.isCprCvrPlausible("111111-1118")).toBe(true);
});

test("CVR plausability", async () => {
  // Non-digits
  expect(_test.isCprCvrPlausible("aaaaaaaa")).toBe(false);

  // Valid
  expect(_test.isCprCvrPlausible("11111111")).toBe(true);
});
