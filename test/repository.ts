import type { PoolClient } from "pg";
import type {
  Charge,
  ChargeWithGatewayMetadata,
  Gavebrev,
  GavebrevCheckin,
} from "../src";
import type {
  DonationWithGatewayInfoAny,
  Donor,
  Earmark,
  GatewayWebhook,
  TaxReportLine,
} from "./types";

export async function insertChargeWithCreatedAt(
  client: PoolClient,
  charge: Partial<Charge>,
): Promise<ChargeWithGatewayMetadata> {
  return (
    await client.query(
      `insert into charge(created_at, donation_id, status) values ($1, $2, $3) returning *`,
      [charge.created_at, charge.donation_id, charge.status],
    )
  ).rows[0];
}

export async function setDonationCancelledById(client: PoolClient, id: string) {
  return await client.query(
    "update donation set cancelled = true where id = $1",
    [id],
  );
}

export async function findAllDonors(client: PoolClient): Promise<Donor[]> {
  return (await client.query(`select * from donor`)).rows;
}

export async function findAllGavebrevs(
  client: PoolClient,
): Promise<Gavebrev[]> {
  return (await client.query(`select * from gavebrev`)).rows;
}

export async function findAllDonations(
  client: PoolClient,
): Promise<DonationWithGatewayInfoAny[]> {
  return (await client.query(`select * from donation`)).rows;
}

export async function findAllCharges(
  client: PoolClient,
): Promise<ChargeWithGatewayMetadata[]> {
  return (await client.query(`select * from charge`)).rows;
}

export async function findAllEarmarks(client: PoolClient): Promise<Earmark[]> {
  return (
    await client.query(`select * from earmark order by donation_id, recipient`)
  ).rows;
}

export async function findAllGatewayWebhooks(
  client: PoolClient,
): Promise<GatewayWebhook[]> {
  return (await client.query(`select * from gateway_webhook`)).rows;
}

export async function findAnnualTaxReport(
  client: PoolClient,
): Promise<TaxReportLine[]> {
  return (await client.query(`select * from annual_tax_report_data`)).rows;
}

export async function findAnnualTaxReportOfficial(
  client: PoolClient,
): Promise<TaxReportLine[]> {
  return (await client.query(`select * from annual_tax_report`)).rows;
}

export async function insertGavebrevCheckin(
  client: PoolClient,
  gavebrevCheckin: Partial<GavebrevCheckin>,
): Promise<GavebrevCheckin> {
  return (
    await client.query(
      `insert into gavebrev_checkin(donor_id, year, income_inferred, income_preliminary, income_verified, limit_normal_donation, custom_minimal_income, custom_maximum_income)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning *`,
      [
        gavebrevCheckin.donor_id,
        gavebrevCheckin.year,
        gavebrevCheckin.income_inferred,
        gavebrevCheckin.income_preliminary,
        gavebrevCheckin.income_verified,
        gavebrevCheckin.limit_normal_donation,
        gavebrevCheckin.custom_minimal_income,
        gavebrevCheckin.custom_maximum_income,
      ],
    )
  ).rows[0];
}

export async function insertMaxTaxDeduction(
  client: PoolClient,
  year: number,
  value: number,
): Promise<GavebrevCheckin> {
  return (
    await client.query(
      `insert into max_tax_deduction (year, value) values ($1, $2)
       on conflict (year) do update set value = $2, updated_at = now()
       returning *`,
      [year, value],
    )
  ).rows[0];
}
