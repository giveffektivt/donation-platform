import { PoolClient } from "pg";
import scanpay from "scanpay";
import {
  ChargeStatus,
  ChargeToChargeScanpay,
  setChargeIdempotencyKey,
  setChargeStatus,
} from "src";

const client = scanpay(process.env.SCANPAY_KEY);

/** Charges subscriber and updates data in Database */
export async function scanpayChargeSubscription(
  db: PoolClient,
  charge: ChargeToChargeScanpay
) {
  let scanpayId = charge.donation_gateway_metadata?.scanpay_id;
  if (!scanpayId) {
    console.error(
      `Charge with ID '${charge.id}' does not have a corresponding Scanpay ID that is required for charging`
    );
    await setChargeStatus(db, { id: charge.id, status: ChargeStatus.Error });
    return;
  }

  if (!charge.gateway_metadata) {
    charge.gateway_metadata = { idempotency_key: "" };
  }

  // Check if there is no idempotency key
  if (!charge.gateway_metadata.idempotency_key) {
    charge.gateway_metadata.idempotency_key = client.generateIdempotencyKey();
    await setChargeIdempotencyKey(db, charge);
  }

  const options = {
    hostname: process.env.SCANPAY_HOSTNAME,
    headers: {
      "Idempotency-Key": charge.gateway_metadata.idempotency_key,
    },
  };

  const data = {
    orderid: charge.short_id,
    items: [
      {
        name: `Donation to ${charge.recipient}`,
        quantity: 1,
        price: `${charge.amount} DKK`,
      },
    ],
    billing: {
      email: charge.email,
      country: "DK",
    },
    autocapture: true,
  };

  let status = ChargeStatus.Waiting;

  try {
    await client.subscriber.charge(scanpayId, data, options);
  } catch (err: any) {
    console.error(`Error while charging ID '${charge.id}':`, err);
    status = ChargeStatus.Error;

    if (err?.type === "ScanpayError") {
      charge.gateway_metadata.idempotency_key = client.generateIdempotencyKey();
      await setChargeIdempotencyKey(db, charge);
    }
  }

  await setChargeStatus(db, { id: charge.id, status });
}
