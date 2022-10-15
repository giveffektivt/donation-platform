import {
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  getLatestScanpaySeq,
  insertScanpaySeq,
} from "src";
import { afterEach, beforeEach, expect, test } from "vitest";

const client = dbClient();

beforeEach(async () => {
  await dbBeginTransaction(await client);
});

afterEach(async () => {
  await dbRollbackTransaction(await client);
});

test("Scanpay sequence tracking", async () => {
  const db = await client;

  await insertScanpaySeq(db, 3);
  await insertScanpaySeq(db, 4);
  await insertScanpaySeq(db, 5);

  expect(await getLatestScanpaySeq(db)).toBe(5);
});
