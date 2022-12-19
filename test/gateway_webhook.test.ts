import { afterEach, beforeEach, expect, test } from "vitest";
import {
  dbBeginTransaction,
  dbClient,
  dbRollbackTransaction,
  insertGatewayWebhook,
  PaymentGateway,
} from "src";
import { findAllGatewayWebhooks } from "./repository";

const client = dbClient();

beforeEach(async () => {
  await dbBeginTransaction(await client);
});

afterEach(async () => {
  await dbRollbackTransaction(await client);
});

test("Insert gateway webhook as JSON object", async () => {
  const db = await client;

  await insertGatewayWebhook(db, PaymentGateway.Quickpay, { hello: "world" });

  expect(await findAllGatewayWebhooks(db)).toMatchObject([
    {
      gateway: PaymentGateway.Quickpay,
      payload: {
        hello: "world",
      },
    },
  ]);
});

test("Insert gateway webhook as JSON string", async () => {
  const db = await client;

  await insertGatewayWebhook(
    db,
    PaymentGateway.Quickpay,
    '{ "hello": "world" }'
  );

  expect(await findAllGatewayWebhooks(db)).toMatchObject([
    {
      gateway: PaymentGateway.Quickpay,
      payload: {
        hello: "world",
      },
    },
  ]);
});
