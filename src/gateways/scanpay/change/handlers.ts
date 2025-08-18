import type { PoolClient } from "pg";
import {
  ChargeStatus,
  logError,
  type ScanpayChange,
  setChargeStatusByShortId,
} from "src";

/** Add scanpayId to a donation */
async function handleSubscriber(_db: PoolClient, change: ScanpayChange) {
  console.error(
    `New ScanPay subscriptions are not supported: ${JSON.stringify(change)}`,
  );
  throw new Error("New ScanPay subscriptions are not supported");
}

/** Add gateway response to a charge */
async function handleCharge(db: PoolClient, change: ScanpayChange) {
  await setChargeStatusByShortId(db, {
    status: getChargeStatusFromLatestAct(change),
    short_id: change.orderid,
  });
}

/** run appropriate handler based on change type */
export async function handleChange(db: PoolClient, change: any) {
  switch (change.type) {
    case "subscriber":
      return await handleSubscriber(db, change);
    case "charge":
    case "transaction":
      return await handleCharge(db, change);
  }
}

const getChargeStatusFromLatestAct = (change: ScanpayChange) => {
  const latestAct = change.acts?.sort((a, b) => b.time - a.time)[0]?.act;

  switch (latestAct) {
    case "capture":
      return ChargeStatus.Charged;
    case "refund":
      return ChargeStatus.Refunded;
    case "void":
      return ChargeStatus.Error;
    default:
      logError(
        "Unexpected latest act in Scanpay change (assuming it was charged)",
        change.acts,
      );
      return ChargeStatus.Charged;
  }
};
