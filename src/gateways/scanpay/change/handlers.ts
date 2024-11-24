import type { PoolClient } from "pg";
import {
  ChargeStatus,
  getDonationIdsByOldDonorId,
  insertInitialChargeScanpay,
  logError,
  type ScanpayChange,
  setChargeStatusByShortId,
  setDonationScanpayId,
} from "src";

/** Add scanpayId to a donation */
async function handleSubscriber(db: PoolClient, change: ScanpayChange) {
  const donationIds = /^\d+$/.test(change.ref)
    ? // if change.ref is a number, it's actually a donor ID in the old database,
      // updates to those might still be coming, so we need to keep code to support them.
      await getDonationIdsByOldDonorId(db, change.ref)
    : // previously we charged donation and membership through a single Scanpay subscription
      // updates to those might still be coming, so we need to keep code to support them
      change.ref.split("_");

  for (const donationId of donationIds) {
    await setDonationScanpayId(db, {
      id: donationId,
      gateway_metadata: {
        scanpay_id: change.id,
      },
    });

    // Now that we know Scanpay ID, create initial charges for this donation
    await insertInitialChargeScanpay(db, { donation_id: donationId });
  }
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
        `Unexpected latest act in Scanpay change (assuming it was charged): ${JSON.stringify(change.acts)}`,
      );
      return ChargeStatus.Charged;
  }
};
