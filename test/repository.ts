import { PoolClient } from "pg";
import {
  Charge,
  ChargeWithGatewayInfo,
  Donation,
  DonationWithGatewayInfoScanPay,
  DonorWithSensitiveInfo,
} from "../src";
import { DonationWithGatewayInfoAny } from "./types";

export async function insertCharge(
  client: PoolClient,
  charge: Partial<Charge>
): Promise<ChargeWithGatewayInfo> {
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
): Promise<ChargeWithGatewayInfo> {
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

export async function findDonation(
  client: PoolClient,
  donation: Partial<DonationWithGatewayInfoScanPay>
): Promise<DonationWithGatewayInfoScanPay> {
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

export async function findAllDonations(
  client: PoolClient
): Promise<DonationWithGatewayInfoAny[]> {
  return (await client.query(`select * from donation_with_gateway_info`)).rows;
}

export async function findAllCharges(
  client: PoolClient
): Promise<ChargeWithGatewayInfo[]> {
  return (await client.query(`select * from charge_with_gateway_info`)).rows;
}
