import type { PoolClient } from "pg";
import {
  type Donation,
  DonationFrequency,
  type DonationRecipient,
  type DonationToEmail,
  type DonationWithGatewayInfoBankTransfer,
  type DonationWithGatewayInfoQuickpay,
  type DonationWithGatewayInfoScanpay,
  type EmailedStatus,
  type FailedRecurringDonation,
  type Fundraiser,
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
    "update donation set cancelled = true where id = $1",
    [id],
  );
}

export async function setDonationCancelledByQuickpayOrder(
  client: PoolClient,
  quickpay_order: string,
) {
  return await client.query(
    `update donation set cancelled = true where gateway_metadata ->> 'quickpay_order' = $1`,
    [quickpay_order],
  );
}

export async function setDonationMethodByQuickpayOrder(
  client: PoolClient,
  quickpay_order: string,
  method: PaymentMethod,
) {
  return await client.query(
    `update donation set method = $1 where gateway_metadata ->> 'quickpay_order' = $2`,
    [method, quickpay_order],
  );
}

export async function insertDonationViaQuickpay(
  client: PoolClient,
  donation: Partial<Donation>,
): Promise<DonationWithGatewayInfoQuickpay> {
  return (
    await client.query(
      `insert into donation (donor_id, amount, frequency, gateway, method, tax_deductible, fundraiser_id, message, gateway_metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, format('{"quickpay_order": "%s"}', gen_short_id('donation', 'gateway_metadata->>''quickpay_order''', 'd-'))::jsonb)
       returning *`,
      [
        donation.donor_id,
        donation.amount,
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
      `insert into donation (donor_id, amount, frequency, gateway, method, tax_deductible, gateway_metadata)
       values ($1, $2, $3, $4, $5, $6, format('{"quickpay_order": "%s"}', gen_short_id('donation', 'gateway_metadata->>''quickpay_order''', 'd-'))::jsonb)
       returning *`,
      [
        donation.donor_id,
        50,
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
      `insert into donation (donor_id, amount, frequency, gateway, method, tax_deductible, fundraiser_id, message, gateway_metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, format('{"bank_msg": "%s"}', gen_short_id('donation', 'gateway_metadata->>''bank_msg''', 'd-'))::jsonb)
       returning *`,
      [
        donation.donor_id,
        donation.amount,
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

export async function insertDonationEarmark(
  client: PoolClient,
  donation_id: string,
  recipient: DonationRecipient,
  percentage: number,
): Promise<DonationWithGatewayInfoQuickpay> {
  return (
    await client.query(
      `insert into earmark(donation_id, recipient, percentage)
       values ($1, $2, $3)
       returning *`,
      [donation_id, recipient, percentage],
    )
  ).rows[0];
}

export async function copyDonationEarmarks(
  client: PoolClient,
  from_donation_id: string,
  to_donation_id: string,
) {
  return (
    await client.query(
      `insert into earmark(donation_id, recipient, percentage)
     select $1, recipient, percentage
     from earmark
     where donation_id = $2
     returning *`,
      [to_donation_id, from_donation_id],
    )
  ).rows;
}

export async function setDonationQuickpayId(
  client: PoolClient,
  donation: Partial<DonationWithGatewayInfoQuickpay>,
) {
  return await client.query(
    `update donation set gateway_metadata = gateway_metadata::jsonb || format('{"quickpay_id": "%s"}', $1::text)::jsonb where id=$2`,
    [donation.gateway_metadata?.quickpay_id, donation.id],
  );
}

export async function getFailedRecurringDonations(
  client: PoolClient,
): Promise<FailedRecurringDonation[]> {
  return (await client.query("select * from failed_recurring_donations")).rows;
}

export async function getFailedRecurringDonationByQuickpayOrder(
  client: PoolClient,
  quickpay_order: string,
): Promise<FailedRecurringDonation> {
  return (
    await client.query(
      `select p.id as donor_id, p.email as donor_email, d.recipient, d.amount, p.name as donor_name, d.gateway_metadata ->> 'quickpay_order' as quickpay_order
       from donor p
       join donation d on p.id = d.donor_id
       where d.gateway_metadata ->> 'quickpay_order' = $1`,
      [quickpay_order],
    )
  ).rows[0];
}

export async function getDonationToUpdateQuickpayPaymentInfoById(
  client: PoolClient,
  id: string,
): Promise<DonationWithGatewayInfoQuickpay | null> {
  return (
    await client.query(
      `select d.* from donation d
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
      `insert into fundraiser (email, title, has_match, match_currency)
       values ($1, $2, $3, $4)
       returning *`,
      [
        fundraiser.email,
        fundraiser.title,
        fundraiser.has_match,
        fundraiser.match_currency,
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
      select id, title, has_match, match_currency, (select coalesce(sum(amount),0) from donation d join charge c on d.id = c.donation_id where fundraiser_id = $1 and c.status = 'charged') as raised
      from fundraiser
      where id = $1`,
      [id],
    )
  ).rows[0];
}
