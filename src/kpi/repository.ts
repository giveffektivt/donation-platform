import { PoolClient } from "pg";
import { Kpi, TransferredDistribution, TimeDistribution, PendingDistribution } from "src";

export async function getKpi(client: PoolClient): Promise<Kpi> {
  return (await client.query("select * from kpi")).rows[0];
}

export async function getPendingDistribution(
  client: PoolClient
): Promise<PendingDistribution[]> {
  return (await client.query("select * from pending_distribution")).rows;
}

export async function getTransferredDistribution(
  client: PoolClient
): Promise<TransferredDistribution[]> {
  return (await client.query("select * from transferred_distribution")).rows;
}

export async function getTimeDistribution(
  client: PoolClient
): Promise<TimeDistribution[]> {
  return (await client.query("select * from time_distribution")).rows;
}
