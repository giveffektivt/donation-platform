import type { PoolClient } from "pg";
import type { Gavebrev, GavebrevStatus, GavebrevType } from "src";

export async function registerGavebrev(
  client: PoolClient,
  data: {
    name: string;
    email: string;
    tin: string;
    type: GavebrevType;
    amount: number;
    minimal_income?: number;
    started_at: Date;
    stopped_at: Date;
  },
): Promise<Gavebrev> {
  return (
    await client.query(
      `select * from register_gavebrev(
        p_name => $1,
        p_email => $2,
        p_tin => $3,
        p_type => $4,
        p_amount => $5,
        p_minimal_income => $6,
        p_started_at => $7,
        p_stopped_at => $8
      )`,
      [
        data.name,
        data.email,
        data.tin,
        data.type,
        data.amount,
        data.minimal_income,
        data.started_at,
        data.stopped_at,
      ],
    )
  ).rows[0];
}

export async function setGavebrevStatus(
  client: PoolClient,
  id: string,
  status: GavebrevStatus,
): Promise<number> {
  return (
    await client.query(
      "update gavebrev set status = $1 where id = $2 returning 1",
      [status, id],
    )
  ).rows.length;
}

export async function setGavebrevStopped(
  client: PoolClient,
  id: string,
  stoppedAt: Date,
): Promise<number> {
  return (
    await client.query(
      "update gavebrev set stopped_at = $1 where id = $2 returning 1",
      [stoppedAt, id],
    )
  ).rows.length;
}

export async function findAllGavebrev(client: PoolClient): Promise<Gavebrev[]> {
  return (
    await client.query(
      "select id, status from gavebrev where stopped_at > now()",
    )
  ).rows;
}
