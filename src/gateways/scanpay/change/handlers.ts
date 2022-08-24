import { PoolClient } from "pg";
import {
  ChargeStatus,
  getDonationIdsByOldDonorId,
  insertInitialCharge,
  ScanPayChange,
  setChargeWithGatewayResponseByShortId,
  setDonationScanPayId,
} from "src";

/** Add scanpayId to a donation */
async function handleSubscriber(db: PoolClient, change: ScanPayChange) {
  // If change.ref is a number, it's actually a donor ID in the old database
  const donationIds = /^\d+$/.test(change.ref)
    ? await getDonationIdsByOldDonorId(db, change.ref)
    : change.ref.split("_");

  for (let donationId of donationIds) {
    await setDonationScanPayId(db, {
      id: donationId,
      gateway_metadata: {
        scanpay_id: change.id,
      },
    });

    // Now that we know ScanPay ID, create initial charges for this donation
    await insertInitialCharge(db, { donation_id: donationId });
  }
}

/** Add gateway response to a charge */
async function handleCharge(db: PoolClient, change: ScanPayChange) {
  await setChargeWithGatewayResponseByShortId(db, {
    status: getChargeStatusFromLatestAct(change),
    short_id: change.orderid,
    gateway_response: change,
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

const getChargeStatusFromLatestAct = (change: ScanPayChange) => {
  const latestAct = change.acts?.sort((a, b) => b.time - a.time)[0]?.act;

  switch (latestAct) {
    case "capture":
      return ChargeStatus.Charged;
    case "refund":
      return ChargeStatus.Refunded;
    case "void":
      return ChargeStatus.Error;
    default:
      console.error(
        "Unexpected latest act in ScanPay change (assuming it was charged):",
        change.acts
      );
      return ChargeStatus.Charged;
  }
};
