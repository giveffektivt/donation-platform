import { PoolClient } from "pg";
import {
  Donation,
  DonationFrequency,
  DonationRecipient,
  DonationToEmail,
  DonationWithGatewayInfoBankTransfer,
  DonationWithGatewayInfoScanPay,
  EmailedStatus,
  PaymentGateway,
  PaymentMethod,
} from "src";

export async function getDonationsToEmail(
  client: PoolClient
): Promise<DonationToEmail[]> {
  return (await client.query("select * from donations_to_email")).rows;
}

export async function setDonationEmailed(
  client: PoolClient,
  donation: Partial<DonationToEmail>,
  status: EmailedStatus
) {
  return await client.query("update donation set emailed=$1 where id=$2", [
    status,
    donation.id,
  ]);
}

export async function insertDonationViaScanPay(
  client: PoolClient,
  donation: Partial<Donation>
): Promise<DonationWithGatewayInfoScanPay> {
  return (
    await client.query(
      `insert into donation (donor_id, amount, recipient, frequency, gateway, method, tax_deductible)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [
        donation.donor_id,
        donation.amount,
        donation.recipient,
        donation.frequency,
        PaymentGateway.ScanPay,
        donation.method,
        donation.tax_deductible,
      ]
    )
  ).rows[0];
}

export async function insertDonationMembershipViaScanPay(
  client: PoolClient,
  donation: Partial<DonationWithGatewayInfoScanPay>
): Promise<DonationWithGatewayInfoScanPay> {
  return (
    await client.query(
      `insert into donation_with_gateway_info (donor_id, amount, recipient, frequency, gateway, method, tax_deductible)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [
        donation.donor_id,
        50,
        DonationRecipient.GivEffektivtMembership,
        DonationFrequency.Yearly,
        PaymentGateway.ScanPay,
        donation.method,
        false,
      ]
    )
  ).rows[0];
}

export async function insertDonationViaBankTransfer(
  client: PoolClient,
  donation: Partial<Donation>
): Promise<DonationWithGatewayInfoBankTransfer> {
  return (
    await client.query(
      `insert into donation_with_gateway_info (donor_id, amount, recipient, frequency, gateway, method, tax_deductible, gateway_metadata)
       values ($1, $2, $3, $4, $5, $6, $7, format('{"bank_msg": "%s"}', gen_short_id('donation_with_gateway_info', 'gateway_metadata->>''bank_msg'''))::jsonb)
       returning *`,
      [
        donation.donor_id,
        donation.amount,
        donation.recipient,
        donation.frequency,
        PaymentGateway.BankTransfer,
        PaymentMethod.BankTransfer,
        donation.tax_deductible,
      ]
    )
  ).rows[0];
}

export async function insertDonationMembershipViaBankTransfer(
  client: PoolClient,
  donation: Partial<DonationWithGatewayInfoBankTransfer>
): Promise<DonationWithGatewayInfoBankTransfer> {
  return (
    await client.query(
      `insert into donation_with_gateway_info (donor_id, amount, recipient, frequency, gateway, method, tax_deductible, gateway_metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning *`,
      [
        donation.donor_id,
        50,
        DonationRecipient.GivEffektivtMembership,
        DonationFrequency.Yearly,
        PaymentGateway.BankTransfer,
        PaymentMethod.BankTransfer,
        false,
        donation.gateway_metadata,
      ]
    )
  ).rows[0];
}

export async function setDonationScanPayId(
  client: PoolClient,
  donation: Partial<DonationWithGatewayInfoScanPay>
) {
  return await client.query(
    `update donation_with_gateway_info set gateway_metadata = gateway_metadata::jsonb || format('{"scanpay_id": %s}', $1::numeric)::jsonb where id=$2`,
    [donation.gateway_metadata?.scanpay_id, donation.id]
  );
}

export async function getDonationIdsByOldDonorId(
  client: PoolClient,
  old_donor_id: string
): Promise<string[]> {
  return (
    await client.query(
      "select donation_id from old_ids_map where old_donor_id = $1",
      [old_donor_id]
    )
  ).rows.map((r) => r.donation_id);
}
