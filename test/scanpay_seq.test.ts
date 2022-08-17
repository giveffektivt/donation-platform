import {
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  getLatestScanPaySeq,
  insertScanPaySeq,
} from "src";
import { afterEach, beforeEach, expect, test } from "vitest";

const client = dbClient();

beforeEach(async () => {
  await dbBeginTransaction(await client);
});

afterEach(async () => {
  await dbRollbackTransaction(await client);
});

test("ScanPay sequence tracking", async () => {
  const db = await client;

  await insertScanPaySeq(db, 3);
  await insertScanPaySeq(db, 4);
  await insertScanPaySeq(db, 5);

  expect(await getLatestScanPaySeq(db)).toBe(5);
});
