import { PoolClient } from "pg";
import {
  Charge,
  ChargeToCharge,
  ChargeToChargeScanpay,
  ChargeWithGatewayInfo,
} from "src";

export async function insertCharge(
  client: PoolClient,
  charge: Partial<Charge>
): Promise<ChargeWithGatewayInfo> {
  return (
    await client.query(
      `insert into charge_with_gateway_info (donation_id, status) values ($1, $2) returning *`,
      [charge.donation_id, charge.status]
    )
  ).rows[0];
}

export async function insertInitialChargeScanpay(
  client: PoolClient,
  charge: Partial<Charge>
): Promise<ChargeWithGatewayInfo> {
  return (
    await client.query(
      `insert into charge_with_gateway_info (donation_id, status)
       select $1, 'created'
       where not exists (select id from charge where donation_id = $1 limit 1)
       returning *`,
      [charge.donation_id]
    )
  ).rows[0];
}

export async function insertInitialChargeQuickpay(
  client: PoolClient,
  quickpay_order: string
): Promise<ChargeWithGatewayInfo> {
  return (
    await client.query(
      `with d as (select id from donation_with_gateway_info where gateway_metadata ->> 'quickpay_order' = $1 limit 1)
       insert into charge_with_gateway_info (donation_id, status)
       select id, 'created' from d
       where not exists (select id from charge where donation_id = d.id limit 1)
       returning *`,
      [quickpay_order]
    )
  ).rows[0];
}

export async function insertChargesForDonationsToCreateCharges(
  client: PoolClient
): Promise<Charge[]> {
  return (
    await client.query(
      `insert into charge (donation_id, created_at, status)
       select donation_id, next_charge, 'created' from donations_to_create_charges
       returning *`
    )
  ).rows;
}

export async function getChargesToCharge(
  client: PoolClient
): Promise<ChargeToCharge[]> {
  return (await client.query(`select * from charges_to_charge`)).rows;
}

export async function setChargeStatus(
  client: PoolClient,
  charge: Partial<Charge>
) {
  return await client.query("update charge set status=$1 where id=$2", [
    charge.status,
    charge.id,
  ]);
}

export async function setChargeIdempotencyKey(
  client: PoolClient,
  charge: Partial<ChargeToChargeScanpay>
) {
  return await client.query(
    `update charge_with_gateway_info set gateway_metadata = gateway_metadata::jsonb || format('{"idempotency_key": "%s"}', $1::text)::jsonb where id=$2`,
    [charge.gateway_metadata?.idempotency_key, charge.id]
  );
}

export async function setChargeWithGatewayResponseByShortId(
  client: PoolClient,
  charge: Partial<ChargeWithGatewayInfo>
) {
  return await client.query(
    `update charge_with_gateway_info set status=$1, gateway_response=$2 where short_id=$3`,
    [charge.status, charge.gateway_response, charge.short_id]
  );
}
