import { PoolClient } from "pg";
import { Kpi, RecipientDistribution, TimeDistribution } from "src";

export async function getKpi(client: PoolClient): Promise<Kpi> {
  return (await client.query("select * from kpi")).rows[0];
}

export async function getRecipientDistribution(
  client: PoolClient
): Promise<RecipientDistribution[]> {
  return (await client.query("select * from recipient_distribution")).rows;
}

export async function getTimeDistribution(
  client: PoolClient
): Promise<TimeDistribution[]> {
  return (await client.query("select * from time_distribution")).rows;
}
