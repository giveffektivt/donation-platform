import type { PoolClient } from "pg";
import type {
  Kpi,
  TransferredDistribution,
  TimeDistribution,
  PendingDistribution,
  FundraiserKpi,
} from "src";

export async function getKpi(client: PoolClient): Promise<Kpi> {
  return (await client.query("select * from kpi")).rows[0];
}

export async function getPendingDistribution(
  client: PoolClient,
): Promise<PendingDistribution[]> {
  return (await client.query("select * from pending_distribution")).rows;
}

export async function getTransferredDistribution(
  client: PoolClient,
): Promise<TransferredDistribution[]> {
  return (await client.query("select * from transferred_distribution")).rows;
}

export async function getTimeDistribution(
  client: PoolClient,
): Promise<TimeDistribution[]> {
  return (await client.query("select * from time_distribution")).rows;
}

export async function getRecentMembersCount(
  client: PoolClient,
): Promise<number> {
  return (
    await client.query(`
      with already_member as (
          select distinct
              p.tin
          from
              donor_with_sensitive_info p
              inner join donation d on d.donor_id = p.id
              inner join charge c on c.donation_id = d.id
          where
              c.status = 'charged'
              and d.recipient = 'Giv Effektivt'
              and c.created_at between '2024-01-01' and '2024-09-09'
      )
      select
          count(distinct p.tin)::numeric as count
      from
          donor_with_sensitive_info p
          inner join donation d on d.donor_id = p.id
          inner join charge c on c.donation_id = d.id
          left join already_member a on p.tin = a.tin
      where
          c.status = 'charged'
          and d.recipient = 'Giv Effektivt'
          and c.created_at >= '2024-09-09'
          and p.created_at >= '2024-09-09'
          and a.tin is null
    `)
  ).rows[0].count;
}

export async function getFundraiserKpi(
  client: PoolClient,
  id: string,
  key: string,
): Promise<FundraiserKpi[]> {
  return (
    await client.query(
      `
      with data as (
          select
              d.id,
              coalesce(sum(
                      case when c.status = 'charged' then
                          d.amount
                      else
                          0
                      end), 0) as total_amount
          from
              donation d
              join fundraiser f on f.id = d.fundraiser_id
                  and f.id = $1
                  and f.key = $2
              left join charge c on c.donation_id = d.id
          group by
              d.id
      )
      select
          d.created_at,
          d.message,
          d.frequency,
          d.cancelled,
          data.total_amount
      from
          data
          join donation_with_contact_info d on data.id = d.id
      order by
          d.created_at desc;
    `,
      [id, key],
    )
  ).rows;
}
