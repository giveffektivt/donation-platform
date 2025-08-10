import type { PoolClient } from "pg";
import {
  DonationFrequency,
  DonationRecipient,
  type DonationToEmail,
  type DonationWithGatewayInfoBankTransfer,
  type DonationWithGatewayInfoQuickpay,
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

export async function registerDonationViaQuickpay(
  client: PoolClient,
  data: {
    amount: number;
    frequency: DonationFrequency;
    method: PaymentMethod;
    tax_deductible: boolean;
    fundraiser_id?: string;
    message?: string;
    earmarks: { recipient: DonationRecipient; percentage: number }[];
    email: string;
    tin?: string;
  },
): Promise<DonationWithGatewayInfoQuickpay> {
  return (
    await client.query(
      `select * from register_donation(
        p_amount => $1,
        p_frequency => $2,
        p_gateway => $3,
        p_method => $4,
        p_tax_deductible => $5,
        p_fundraiser_id => $6,
        p_message => $7,
        p_earmarks => $8,
        p_email => $9,
        p_tin => $10
      )`,
      [
        data.amount,
        data.frequency,
        PaymentGateway.Quickpay,
        data.method,
        data.tax_deductible,
        data.fundraiser_id,
        data.message,
        JSON.stringify(data.earmarks),
        data.email,
        data.tin,
      ],
    )
  ).rows[0];
}

export async function registerMembershipViaQuickpay(
  client: PoolClient,
  data: {
    email: string;
    tin: string;
    name: string;
    address: string;
    postcode: string;
    city: string;
    country: string;
    birthday?: Date;
  },
): Promise<DonationWithGatewayInfoQuickpay> {
  return (
    await client.query(
      `select * from register_donation(
        p_amount => $1,
        p_frequency => $2,
        p_gateway => $3,
        p_method => $4,
        p_tax_deductible => $5,
        p_fundraiser_id => $6,
        p_message => $7,
        p_earmarks => $8,
        p_email => $9,
        p_tin => $10,
        p_name => $11,
        p_address => $12,
        p_postcode => $13,
        p_city => $14,
        p_country => $15,
        p_birthday => $16
      )`,
      [
        50,
        DonationFrequency.Yearly,
        PaymentGateway.Quickpay,
        PaymentMethod.CreditCard,
        false,
        null,
        null,
        JSON.stringify([
          {
            recipient: DonationRecipient.GivEffektivtsMedlemskab,
            percentage: 100,
          },
        ]),
        data.email,
        data.tin,
        data.name,
        data.address,
        data.postcode,
        data.city,
        data.country,
        data.birthday,
      ],
    )
  ).rows[0];
}

export async function registerDonationViaBankTransfer(
  client: PoolClient,
  data: {
    amount: number;
    frequency: DonationFrequency;
    tax_deductible: boolean;
    fundraiser_id?: string;
    message?: string;
    earmarks: { recipient: DonationRecipient; percentage: number }[];
    email: string;
    tin?: string;
  },
): Promise<DonationWithGatewayInfoBankTransfer> {
  return (
    await client.query(
      `select * from register_donation(
        p_amount => $1,
        p_frequency => $2,
        p_gateway => $3,
        p_method => $4,
        p_tax_deductible => $5,
        p_fundraiser_id => $6,
        p_message => $7,
        p_earmarks => $8,
        p_email => $9,
        p_tin => $10
      )`,
      [
        data.amount,
        data.frequency,
        PaymentGateway.BankTransfer,
        PaymentMethod.BankTransfer,
        data.tax_deductible,
        data.fundraiser_id,
        data.message,
        JSON.stringify(data.earmarks),
        data.email,
        data.tin,
      ],
    )
  ).rows[0];
}

export async function recreateFailedRecurringDonation(
  client: PoolClient,
  donation_id: string,
): Promise<DonationWithGatewayInfoQuickpay> {
  return (
    await client.query(`select * from recreate_failed_recurring_donation($1)`, [
      donation_id,
    ])
  ).rows[0];
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
