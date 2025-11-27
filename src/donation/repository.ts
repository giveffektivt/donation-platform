import type { PoolClient } from "pg";
import {
  DonationFrequency,
  DonationRecipient,
  type DonationToEmail,
  type DonationWithGatewayInfoBankTransfer,
  type DonationWithGatewayInfoQuickpay,
  type Donor,
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
    publicMessageAuthor?: boolean;
    messageAuthor?: string;
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
        p_public_message_author => $7,
        p_message_author => $8,
        p_message => $9,
        p_earmarks => $10,
        p_email => $11,
        p_tin => $12
      )`,
      [
        data.amount,
        data.frequency,
        PaymentGateway.Quickpay,
        data.method,
        data.taxDeductible,
        data.fundraiserId,
        data.publicMessageAuthor,
        data.messageAuthor,
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
        p_earmarks => $6,
        p_email => $7,
        p_tin => $8,
        p_name => $9,
        p_address => $10,
        p_postcode => $11,
        p_city => $12,
        p_country => $13,
        p_birthday => $14
      )`,
      [
        50,
        DonationFrequency.Yearly,
        PaymentGateway.Quickpay,
        PaymentMethod.CreditCard,
        false,
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
    publicMessageAuthor?: boolean;
    messageAuthor?: string;
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
        p_public_message_author => $7,
        p_message_author => $8,
        p_message => $9,
        p_earmarks => $10,
        p_email => $11,
        p_tin => $12
      )`,
      [
        data.amount,
        data.frequency,
        PaymentGateway.BankTransfer,
        PaymentMethod.BankTransfer,
        data.taxDeductible,
        data.fundraiserId,
        data.publicMessageAuthor,
        data.messageAuthor,
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
select
    jsonb_agg(
        jsonb_build_object(
            'id',
            f.id,
            'registered',
            to_char(f.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
            'lastUpdated',
            to_char(f.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
            'donor',
            jsonb_build_object('id', f.id, 'name', f.title),
            'statistics',
            jsonb_build_object('totalSum', s.total_sum, 'donationCount', s.donation_count, 'averageDonation', s.avg_donation)
        )
        order by
            f.created_at
    ) as result
from
    fundraiser f
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
            d.fundraiser_id = f.id
    ) s on true;
      `,
    )
  ).rows[0].result;
}

export async function getFundraiserNew(client: PoolClient, id: string) {
  return (
    await client.query(
      `
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
    (
        select
            coalesce(sum(d.amount), 0)::numeric as total_sum,
            coalesce(count(*), 0)::int as donation_count
        from
            donation d
            join charge c on c.donation_id = d.id
            and c.status = 'charged'
        where
            d.fundraiser_id = $1
    ) t
    cross join (
        select
            jsonb_agg(
                jsonb_build_object(
                    'id',
                    d.id,
                    'name',
                    case
                        when d.public_message_author then d.message_author
                        else null
                    end,
                    'message',
                    d.message,
                    'amount',
                    d.amount,
                    'date',
                    to_char(d.created_at AT time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
                )
                order by
                    d.created_at desc
            ) as transactions
        from
            donation d
            join charge c on c.donation_id = d.id
            and c.status = 'charged'
        where
            d.fundraiser_id = $1
    ) tx;
      `,
      [id],
    )
  ).rows[0].result;
}

export async function getFundraiserSums(client: PoolClient, ids: string[]) {
  return (
    await client.query(
      `
select
    jsonb_agg(jsonb_build_object('fundraiserId', f.id, 'sum', coalesce(t.total_sum, 0))) as result
from
    fundraiser f
    left join lateral (
        select
            coalesce(sum(d.amount), 0)::numeric as total_sum
        from
            donation d
            join charge c on c.donation_id = d.id
            and c.status = 'charged'
        where
            d.fundraiser_id = f.id
    ) t on true
where
    f.id = any($1);
      `,
      [ids],
    )
  ).rows[0].result;
}

export async function getDonorByEmail(
  client: PoolClient,
  email: string,
): Promise<Donor> {
  return (
    await client.query(
      `
      select name, created_at
      from donor
      where email = $1
      order by created_at
      limit 1`,
      [email],
    )
  ).rows[0];
}

export async function getDonorIdsByEmail(
  client: PoolClient,
  email: string,
): Promise<Donor[]> {
  return (
    await client.query(
      `
      select id
      from donor
      where email = $1
      order by created_at`,
      [email],
    )
  ).rows;
}

export async function getDonorsDetailedByEmail(
  client: PoolClient,
  email: string,
) {
  return (
    await client.query(
      `
      with donor_donations as (
        select
          donor_id,
          name,
          tin,
          donation_created_at as created_at,
          donation_id,
          amount,
          tax_deductible,
          charged_at,
          extract(year from charged_at) as donation_year
        from charged_donations
        where email = $1
      ),
      donor_stats as (
        select
          donor_id,
          name,
          tin,
          min(created_at) as created_at,
          coalesce(sum(amount), 0) as sum_donations,
          count(donation_id) as num_donations
        from donor_donations
        group by donor_id, name, tin
      ),
      combined_tax_data as (
        select
          donor_cpr,
          year,
          ll8a_or_gavebrev,
          total,
          now() as created_at
        from annual_tax_report
        union all
        select
          donor_cpr,
          year,
          ll8a_or_gavebrev,
          total,
          created_at
        from skat
      ),
      latest_skat as (
        select distinct on (donor_cpr, year, ll8a_or_gavebrev)
          donor_cpr,
          year,
          ll8a_or_gavebrev,
          total
        from combined_tax_data
        order by donor_cpr, year, ll8a_or_gavebrev, created_at desc
      ),
      skat_by_year as (
        select
          donor_cpr,
          year,
          max(case when ll8a_or_gavebrev = 'L' then total else 0 end) as l_total,
          max(case when ll8a_or_gavebrev = 'A' then total else 0 end) as a_total
        from latest_skat
        group by donor_cpr, year
      ),
      tax_deductions as (
        select
          dd.donor_id,
          dd.donation_year as year,
          sum(dd.amount) as sum_donations,
          coalesce(
            sb.l_total + least(sb.a_total, coalesce((select value from max_tax_deduction where year = dd.donation_year limit 1), 0)),
            0
          ) as deduction
        from donor_donations dd
        left join skat_by_year sb on
          replace(dd.tin, '-', '') = sb.donor_cpr and
          dd.donation_year = sb.year
        where dd.donation_year is not null
        group by dd.donor_id, dd.donation_year, sb.l_total, sb.a_total
        order by dd.donation_year desc
      )
      select
        ds.donor_id,
        ds.name,
        ds.tin,
        ds.created_at,
        ds.sum_donations,
        ds.num_donations,
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'year', td.year,
              'sumDonations', td.sum_donations,
              'deduction', td.deduction,
              'benefit', round((td.deduction * 0.26)::numeric, 2)
            )
            order by td.year desc
          ) filter (where td.year is not null),
          '[]'::jsonb
        ) as tax_deductions
      from donor_stats ds
      left join tax_deductions td on ds.donor_id = td.donor_id
      group by ds.donor_id, ds.name, ds.tin, ds.created_at, ds.sum_donations, ds.num_donations
      order by ds.created_at
      `,
      [email],
    )
  ).rows;
}

export async function getAggregatedDonationsByEmail(
  client: PoolClient,
  email: string,
) {
  return (
    await client.query(
      `
      select earmark, sum(amount) as total, extract(year from charged_at) as year
      from charged_donations_by_transfer
      where email = $1
      group by earmark, extract(year from charged_at)
      `,
      [email],
    )
  ).rows;
}

export async function getDonationsByEmail(client: PoolClient, email: string) {
  return (
    await client.query(
      `
      select *
      from charged_donations_by_transfer
      where email = $1
      `,
      [email],
    )
  ).rows;
}

export async function getRecurringDonationsByEmail(
  client: PoolClient,
  email: string,
) {
  return (
    await client.query(
      `
      select
        d.*,
        coalesce(extract(day from c.created_at)::int, 0) as monthly_charge_day
      from donation d
      join donor p on p.id = d.donor_id
      left join lateral (
        select ch.created_at
        from charge ch
        where ch.donation_id = d.id
        order by ch.created_at desc
        limit 1
      ) c on true
      where p.email = $1 and d.frequency <> 'once';
      `,
      [email],
    )
  ).rows;
}

export async function getDonationDistributions(
  client: PoolClient,
  email: string,
  ids: string[],
) {
  return (
    await client.query(
      `
      select
          d.id,
          d.donor_id,
          coalesce(
              (
                  select
                      jsonb_agg(
                          jsonb_build_object('recipient', e.recipient, 'percentage', e.percentage)
                          order by
                              e.percentage desc
                      )
                  from
                      earmark e
                  where
                      e.donation_id = d.id
              ),
              '[]'::jsonb
          ) as earmarks
      from
          donation d
          join donor p on p.id = d.donor_id
      where
          p.email = $1
          and d.id = any ($2);
      `,
      [email, ids],
    )
  ).rows;
}
