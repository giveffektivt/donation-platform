import type { PoolClient } from "pg";
import { afterEach, expect, test, vi } from "vitest";

const { setChargeQuickpayMetadata, setChargeStatus, logError } = vi.hoisted(() => ({
  setChargeQuickpayMetadata: vi.fn(),
  setChargeStatus: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("src", () => ({
  ChargeStatus: { Waiting: "waiting", Error: "error" },
  PaymentMethod: { MobilePay: "MobilePay", CreditCard: "CreditCard" },
  setChargeQuickpayMetadata,
  setChargeStatus,
  logError,
}));

import { quickpayChargeSubscription } from "../src/gateways/quickpay/payment/api";
import { quickpayHandleChange } from "../src/gateways/quickpay/change/handlers";

const db = {} as PoolClient;
const charge = {
  id: "charge-id",
  short_id: "c-test",
  amount: 100,
  email: "hello@example.com",
  gateway: "Quickpay",
  method: "MobilePay",
  donation_gateway_metadata: { quickpay_id: "123", quickpay_order: "d-test" },
} as Parameters<typeof quickpayChargeSubscription>[1];

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test.each(["https://api.quickpay.net/payments/456/operations/1", "/payments/456/operations/1"])(
  "stores the MobilePay payment ID from Location %s",
  async (location) => {
    vi.stubEnv("QUICKPAY_DONATION_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 202,
          headers: { Location: location },
        }),
      ),
    );

    await quickpayChargeSubscription(db, charge);

    expect(setChargeQuickpayMetadata).toHaveBeenCalledWith(db, "c-test", "456");
    expect(setChargeStatus).toHaveBeenCalledWith(db, { id: "charge-id", status: "waiting" });
  },
);

test("stores the card payment ID from the JSON response", async () => {
  vi.stubEnv("QUICKPAY_DONATION_API_KEY", "test-key");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ id: 789 })));

  await quickpayChargeSubscription(db, { ...charge, method: "CreditCard" as typeof charge.method });

  expect(setChargeQuickpayMetadata).toHaveBeenCalledWith(db, "c-test", 789);
});

test("keeps an accepted charge waiting when Location is missing", async () => {
  vi.stubEnv("QUICKPAY_DONATION_API_KEY", "test-key");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 202 })));

  await quickpayChargeSubscription(db, charge);

  expect(setChargeQuickpayMetadata).not.toHaveBeenCalled();
  expect(logError).toHaveBeenCalled();
  expect(setChargeStatus).toHaveBeenCalledWith(db, { id: "charge-id", status: "waiting" });
});

test.each(["/unexpected/456", "/payments/not-an-id/operations/1"])(
  "skips an unrecognized Location header %s without failing the charge",
  async (location) => {
    vi.stubEnv("QUICKPAY_DONATION_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 202,
          headers: { Location: location },
        }),
      ),
    );

    await quickpayChargeSubscription(db, charge);

    expect(setChargeQuickpayMetadata).not.toHaveBeenCalled();
    expect(setChargeStatus).toHaveBeenCalledExactlyOnceWith(db, { id: "charge-id", status: "waiting" });
  },
);

test("keeps an accepted card charge waiting when JSON cannot be parsed", async () => {
  vi.stubEnv("QUICKPAY_DONATION_API_KEY", "test-key");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("invalid json", { status: 202 })));

  await quickpayChargeSubscription(db, { ...charge, method: "CreditCard" as typeof charge.method });

  expect(setChargeQuickpayMetadata).not.toHaveBeenCalled();
  expect(logError).toHaveBeenCalled();
  expect(setChargeStatus).toHaveBeenCalledExactlyOnceWith(db, { id: "charge-id", status: "waiting" });
});

test("does not mark an accepted charge as failed if saving metadata throws", async () => {
  vi.stubEnv("QUICKPAY_DONATION_API_KEY", "test-key");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ id: 789 })));
  setChargeQuickpayMetadata.mockRejectedValueOnce(new Error("metadata failed"));

  await quickpayChargeSubscription(db, { ...charge, method: "CreditCard" as typeof charge.method });

  expect(logError).toHaveBeenCalled();
  expect(setChargeStatus).toHaveBeenCalledExactlyOnceWith(db, { id: "charge-id", status: "waiting" });
});

test("still marks rejected payment requests as errors", async () => {
  vi.stubEnv("QUICKPAY_DONATION_API_KEY", "test-key");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Rejected", { status: 400 })));

  await quickpayChargeSubscription(db, charge);

  expect(setChargeQuickpayMetadata).not.toHaveBeenCalled();
  expect(setChargeStatus).toHaveBeenCalledExactlyOnceWith(db, { id: "charge-id", status: "error" });
});

test("stores metadata from a payment webhook even without a status change", async () => {
  await quickpayHandleChange(db, {
    id: 456,
    order_id: "c-test",
    type: "Payment",
    state: "new",
    accepted: true,
    acquirer: "vmpepayment",
    test_mode: false,
    operations: [],
  });

  expect(setChargeQuickpayMetadata).toHaveBeenCalledWith(db, "c-test", 456);
});
