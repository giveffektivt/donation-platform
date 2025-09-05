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
  donation_id: string,
  status: EmailedStatus,
) {
  return await client.query("update donation set emailed=$1 where id=$2", [
    status,
    donation_id,
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
    taxDeductible: boolean;
    fundraiserId?: string;
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
        data.taxDeductible,
        data.fundraiserId,
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
    taxDeductible: boolean;
    fundraiserId?: string;
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
        data.taxDeductible,
        data.fundraiserId,
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
      `
      with
          single_recipient as (
              select
                  donation_id,
                  case
                      when count(*) = 1 then max(recipient)
                      else null
                  end as recipient
              from
                  earmark
              group by
                  donation_id
          )
      select
          donor_id,
          email as donor_email,
          sr.recipient,
          amount,
          name as donor_name
      from
          donations_overview d
          left join single_recipient sr on sr.donation_id = d.donation_id
      where
          donation_gateway_metadata ->> 'quickpay_order' = $1
`,
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

export async function getFundraisers(client: PoolClient) {
  return (
    await client.query(
      `
with
    ff as (
        select
            f.*,
            row_number() over (
                order by
                    f.created_at
            ) as seq
        from
            fundraiser f
    )
select
    jsonb_agg(
        jsonb_build_object(
            'id',
            ff.seq,
            'registered',
            to_char(ff.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
            'lastUpdated',
            to_char(ff.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
            'donor',
            jsonb_build_object('id', p.id, 'name', p.name),
            'statistics',
            jsonb_build_object('totalSum', s.total_sum, 'donationCount', s.donation_count, 'averageDonation', s.avg_donation)
        )
        order by
            ff.created_at
    ) as result
from
    ff
    join donor p on p.id = '9621594a-b8f0-4d56-afac-24f1eb36222f'
    left join lateral (
        select
            coalesce(sum(d.amount), 0)::numeric as total_sum,
            coalesce(count(*), 0)::int as donation_count,
            coalesce(round(sum(d.amount)::numeric / nullif(count(*), 0), 2), 0)::numeric as avg_donation
        from
            donation d
            join charge c on c.donation_id = d.id
            and c.status = 'charged'
        where
            d.fundraiser_id = ff.id
    ) s on true;
      `,
    )
  ).rows[0].result;
}

export async function getFundraiserNew(client: PoolClient, id: string) {
  return (
    await client.query(
      `
with
    ff as (
        select
            f.*,
            row_number() over (
                order by
                    f.created_at
            ) as seq
        from
            fundraiser f
    ),
    target as (
        select
            id
        from
            ff
        where
            seq = $1
    )
select
    jsonb_build_object(
        'totalSum',
        coalesce(t.total_sum, 0),
        'donationCount',
        coalesce(t.donation_count, 0),
        'transactions',
        coalesce(tx.transactions, '[]'::jsonb)
    ) as result
from
    target
    left join lateral (
        select
            coalesce(sum(d.amount), 0)::numeric as total_sum,
            coalesce(count(*), 0)::int as donation_count
        from
            donation d
            join charge c on c.donation_id = d.id
            and c.status = 'charged'
        where
            d.fundraiser_id = target.id
    ) t on true
    left join lateral (
        select
            jsonb_agg(
                jsonb_build_object(
                    'id',
                    d.id,
                    'name',
                    dn.name,
                    'message',
                    d.message,
                    'amount',
                    d.amount,
                    'date',
                    to_char(d.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
                )
                order by
                    d.created_at desc
            ) as transactions
        from
            donation d
            join charge c on c.donation_id = d.id
            and c.status = 'charged'
            left join donor dn on dn.id = d.donor_id
        where
            d.fundraiser_id = target.id
    ) tx on true;
      `,
      [id],
    )
  ).rows[0].result;
}
