import { PoolClient } from "pg";
import scanpay from "scanpay";
import {
  ChargeStatus,
  ChargeToCharge,
  setChargeIdempotencyKey,
  setChargeStatus,
} from "src";

const client = scanpay(process.env.SCANPAY_KEY);

/** Charges subscriber and updates data in Database */
export async function chargeWithScanPay(
  db: PoolClient,
  charge: ChargeToCharge
) {
  let scanpayId = charge.donation_gateway_metadata?.scanpay_id;
  if (!scanpayId) {
    console.error(
      `Charge with ID '${charge.id}' does not have a corresponding ScanPay ID that is required for charging`
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
  } else {
    console.warn(
      `Charge with ID '${charge.id}' already has an idempotency key, charging it again`
    );
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

  for (let i = 0; i < 3; i++) {
    try {
      await client.subscriber.charge(scanpayId, data, options);
      await setChargeStatus(db, {
        id: charge.id,
        status: ChargeStatus.Waiting,
      });
      return;
    } catch (err: any) {
      console.error(`Error while charging ID '${charge.id}':`, err);

      if (err?.type === "ScanpayError") {
        charge.gateway_metadata.idempotency_key =
          client.generateIdempotencyKey();
        options.headers["Idempotency-Key"] =
          charge.gateway_metadata.idempotency_key;
        await setChargeIdempotencyKey(db, charge);
      }
    }
  }

  console.error(
    `Charging ID "${charge.id}" failed several times, will not retry anymore`
  );
  await setChargeStatus(db, { id: charge.id, status: ChargeStatus.Error });
}
