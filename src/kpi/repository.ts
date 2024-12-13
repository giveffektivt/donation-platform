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

export async function getTransferOverview(
  client: PoolClient,
): Promise<TransferredDistribution[]> {
  return (await client.query("select * from transfer_overview")).rows;
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

export async function getIgnoredRenewals(client: PoolClient) {
  return (await client.query("select * from ignored_renewals")).rows;
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
