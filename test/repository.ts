import { PoolClient } from "pg";
import {
  Charge,
  ChargeWithGatewayMetadata,
  Donation,
  DonationWithGatewayInfoQuickpay,
  DonationWithGatewayInfoScanpay,
  DonorWithSensitiveInfo,
  Gavebrev,
} from "../src";
import {
  DonationWithGatewayInfoAny,
  DonorWithOldId,
  GatewayWebhook,
} from "./types";

export async function insertCharge(
  client: PoolClient,
  charge: Partial<Charge>
): Promise<ChargeWithGatewayMetadata> {
  return (
    await client.query(
      `insert into charge(created_at, donation_id, status) values ($1, $2, $3) returning *`,
      [charge.created_at, charge.donation_id, charge.status]
    )
  ).rows[0];
}

export async function findCharge(
  client: PoolClient,
  charge: Partial<Charge>
): Promise<ChargeWithGatewayMetadata> {
  return (
    await client.query(`select * from charge_with_gateway_info where id=$1`, [
      charge.id,
    ])
  ).rows[0];
}

export async function setDonationCancelled(
  client: PoolClient,
  donation: Partial<Donation>
) {
  return (
    await client.query(`update donation set cancelled=true where id=$1`, [
      donation.id,
    ])
  ).rows[0];
}

export async function findDonationScanpay(
  client: PoolClient,
  donation: Partial<DonationWithGatewayInfoScanpay>
): Promise<DonationWithGatewayInfoScanpay> {
  return (
    await client.query(`select * from donation_with_gateway_info where id=$1`, [
      donation.id,
    ])
  ).rows[0];
}

export async function findDonationQuickpay(
  client: PoolClient,
  donation: Partial<DonationWithGatewayInfoQuickpay>
): Promise<DonationWithGatewayInfoQuickpay> {
  return (
    await client.query(`select * from donation_with_gateway_info where id=$1`, [
      donation.id,
    ])
  ).rows[0];
}

export async function findAllDonors(
  client: PoolClient
): Promise<DonorWithSensitiveInfo[]> {
  return (await client.query(`select * from donor_with_sensitive_info`)).rows;
}

export async function findAllGavebrevs(
  client: PoolClient
): Promise<Gavebrev[]> {
  return (await client.query(`select * from gavebrev`)).rows;
}

export async function findAllDonations(
  client: PoolClient
): Promise<DonationWithGatewayInfoAny[]> {
  return (await client.query(`select * from donation_with_gateway_info`)).rows;
}

export async function findAllCharges(
  client: PoolClient
): Promise<ChargeWithGatewayMetadata[]> {
  return (await client.query(`select * from charge_with_gateway_info`)).rows;
}

export async function findAllGatewayWebhooks(
  client: PoolClient
): Promise<GatewayWebhook[]> {
  return (await client.query(`select * from gateway_webhook`)).rows;
}

export async function insertOldDonor(
  client: PoolClient,
  donor: Partial<DonorWithOldId>
): Promise<DonorWithOldId> {
  return (
    await client.query(
      `insert into _donor(email, _old_id) values ($1, $2) returning *`,
      [donor.email, donor._old_id]
    )
  ).rows[0];
}
