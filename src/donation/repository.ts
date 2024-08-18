import { PoolClient } from "pg";
import {
  Donation,
  DonationFrequency,
  DonationRecipient,
  DonationToEmail,
  DonationWithGatewayInfoBankTransfer,
  DonationWithGatewayInfoQuickpay,
  DonationWithGatewayInfoScanpay,
  EmailedStatus,
  FailedRecurringDonation,
  Fundraiser,
  PaymentGateway,
  PaymentMethod,
} from "src";

export async function getDonationsToEmail(
  client: PoolClient,
): Promise<DonationToEmail[]> {
  return (await client.query("select * from donations_to_email for update"))
    .rows;
}

export async function setDonationEmailed(
  client: PoolClient,
  donation: Partial<DonationToEmail>,
  status: EmailedStatus,
) {
  return await client.query("update donation set emailed=$1 where id=$2", [
    status,
    donation.id,
  ]);
}

export async function setDonationCancelledById(client: PoolClient, id: string) {
  return await client.query(
    `update donation set cancelled = true where id = $1`,
    [id],
  );
}

export async function setDonationCancelledByQuickpayOrder(
  client: PoolClient,
  quickpay_order: string,
) {
  return await client.query(
    `update donation_with_sensitive_info set cancelled = true where gateway_metadata ->> 'quickpay_order' = $1`,
    [quickpay_order],
  );
}

export async function setDonationMethodByQuickpayOrder(
  client: PoolClient,
  quickpay_order: string,
  method: PaymentMethod,
) {
  return await client.query(
    `update donation_with_sensitive_info set method = $1 where gateway_metadata ->> 'quickpay_order' = $2`,
    [method, quickpay_order],
  );
}

export async function insertDonationViaScanpay(
  client: PoolClient,
  donation: Partial<Donation>,
): Promise<DonationWithGatewayInfoScanpay> {
  return (
    await client.query(
      `insert into donation_with_sensitive_info (donor_id, amount, recipient, frequency, gateway, method, tax_deductible, fundraiser_id, message)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning *`,
      [
        donation.donor_id,
        donation.amount,
        donation.recipient,
        donation.frequency,
        PaymentGateway.Scanpay,
        donation.method,
        donation.tax_deductible,
        donation.fundraiser_id,
        donation.message,
      ],
    )
  ).rows[0];
}

export async function insertDonationViaQuickpay(
  client: PoolClient,
  donation: Partial<Donation>,
): Promise<DonationWithGatewayInfoQuickpay> {
  return (
    await client.query(
      `insert into donation_with_sensitive_info (donor_id, amount, recipient, frequency, gateway, method, tax_deductible, fundraiser_id, message, gateway_metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, format('{"quickpay_order": "%s"}', gen_short_id('donation_with_sensitive_info', 'gateway_metadata->>''quickpay_order'''))::jsonb)
       returning *`,
      [
        donation.donor_id,
        donation.amount,
        donation.recipient,
        donation.frequency,
        PaymentGateway.Quickpay,
        donation.method,
        donation.tax_deductible,
        donation.fundraiser_id,
        donation.message,
      ],
    )
  ).rows[0];
}

export async function insertMembershipViaQuickpay(
  client: PoolClient,
  donation: Partial<Donation>,
): Promise<DonationWithGatewayInfoQuickpay> {
  return (
    await client.query(
      `insert into donation_with_sensitive_info (donor_id, amount, recipient, frequency, gateway, method, tax_deductible, gateway_metadata)
       values ($1, $2, $3, $4, $5, $6, $7, format('{"quickpay_order": "%s"}', gen_short_id('donation_with_sensitive_info', 'gateway_metadata->>''quickpay_order'''))::jsonb)
       returning *`,
      [
        donation.donor_id,
        50,
        DonationRecipient.GivEffektivt,
        DonationFrequency.Yearly,
        PaymentGateway.Quickpay,
        donation.method,
        false,
      ],
    )
  ).rows[0];
}

export async function insertDonationViaBankTransfer(
  client: PoolClient,
  donation: Partial<DonationWithGatewayInfoBankTransfer>,
): Promise<DonationWithGatewayInfoBankTransfer> {
  return (
    await client.query(
      `insert into donation_with_sensitive_info (donor_id, amount, recipient, frequency, gateway, method, tax_deductible, fundraiser_id, message, gateway_metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, format('{"bank_msg": "%s"}', gen_short_id('donation_with_sensitive_info', 'gateway_metadata->>''bank_msg'''))::jsonb)
       returning *`,
      [
        donation.donor_id,
        donation.amount,
        donation.recipient,
        donation.frequency,
        PaymentGateway.BankTransfer,
        PaymentMethod.BankTransfer,
        donation.tax_deductible,
        donation.fundraiser_id,
        donation.message,
      ],
    )
  ).rows[0];
}

export async function setDonationScanpayId(
  client: PoolClient,
  donation: Partial<DonationWithGatewayInfoScanpay>,
) {
  return await client.query(
    `update donation_with_sensitive_info set gateway_metadata = gateway_metadata::jsonb || format('{"scanpay_id": %s}', $1::numeric)::jsonb where id=$2`,
    [donation.gateway_metadata?.scanpay_id, donation.id],
  );
}

export async function setDonationQuickpayId(
  client: PoolClient,
  donation: Partial<DonationWithGatewayInfoQuickpay>,
) {
  return await client.query(
    `update donation_with_sensitive_info set gateway_metadata = gateway_metadata::jsonb || format('{"quickpay_id": "%s"}', $1::text)::jsonb where id=$2`,
    [donation.gateway_metadata?.quickpay_id, donation.id],
  );
}

export async function getDonationIdsByOldDonorId(
  client: PoolClient,
  old_donor_id: string,
): Promise<string[]> {
  return (
    await client.query(
      "select donation_id from old_ids_map where old_donor_id = $1",
      [old_donor_id],
    )
  ).rows.map((r) => r.donation_id);
}

export async function getFailedRecurringDonations(
  client: PoolClient,
): Promise<FailedRecurringDonation[]> {
  return (await client.query("select * from failed_recurring_donations")).rows;
}

export async function getDonationToUpdateQuickpayPaymentInfoById(
  client: PoolClient,
  id: string,
): Promise<DonationWithGatewayInfoQuickpay | null> {
  return (
    await client.query(
      `select d.* from donation_with_sensitive_info d
       left join charge c on d.id = c.donation_id and c.status != 'created'
       where d.id = $1 and c.donation_id is null and d.gateway = 'Quickpay' and d.frequency != 'once' and not d.cancelled`,
      [id],
    )
  ).rows[0];
}

export async function insertFundraiser(
  client: PoolClient,
  fundraiser: Partial<Fundraiser>,
): Promise<Fundraiser> {
  return (
    await client.query(
      `insert into fundraiser (email, title, description, media, target)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [
        fundraiser.email,
        fundraiser.title,
        fundraiser.description,
        fundraiser.media,
        fundraiser.target,
      ],
    )
  ).rows[0];
}

export async function getFundraiser(
  client: PoolClient,
  id: string,
): Promise<Fundraiser[]> {
  return (
    await client.query(
      `
      select id, title, description, media, target, has_match, match_currency, (select coalesce(sum(amount),0) from donation d join charge c on d.id = c.donation_id where fundraiser_id = $1 and c.status = 'charged') as raised
      from fundraiser
      where id = $1`,
      [id],
    )
  ).rows[0];
}
