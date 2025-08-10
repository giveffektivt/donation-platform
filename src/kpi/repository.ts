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
  from: string,
  to: string,
  useDaily: boolean,
): Promise<TimeDistribution[]> {
  return (
    await client.query(
      `select * from time_distribution_${useDaily ? "daily" : "monthly"} where date between $1 and $2`,
      [from, to],
    )
  ).rows;
}

export async function getIgnoredRenewals(client: PoolClient) {
  return (await client.query("select * from ignored_renewals")).rows;
}

export async function getValueLostAnalysis(client: PoolClient) {
  return (await client.query("select * from value_lost_analysis")).rows;
}

export async function getClearhausUpcomingSettlement(
  client: PoolClient,
  merchant_id: string,
): Promise<number> {
  return (
    await client.query(
      "select amount from clearhaus_settlement where merchant_id = $1 order by created_at desc limit 1",
      [merchant_id],
    )
  ).rows[0]?.amount;
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
          join donation d on data.id = d.id
      order by
          d.created_at desc;
    `,
      [id, key],
    )
  ).rows;
}

export async function getDailyDonatedStats(
  client: PoolClient,
): Promise<{ date: string; sum: number }[]> {
  return (
    await client.query(
      `
        select
            date_trunc('day', c.created_at) as date,
            sum(amount)
        from
            donation d
            join charge c on c.donation_id = d.id
        where
            c.status = 'charged'
            and not exists (select 1 from earmark where donation_id = d.id and recipient = 'Giv Effektivts medlemskab')
        group by
            date_trunc('day', c.created_at)
        order by
            date
      `,
    )
  ).rows;
}
