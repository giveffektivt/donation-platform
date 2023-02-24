import { PoolClient } from "pg";
import { Gavebrev, GavebrevStatus } from "src";

export async function insertGavebrev(
  client: PoolClient,
  gavebrev: Partial<Gavebrev>
): Promise<Gavebrev> {
  return (
    await client.query(
      "insert into gavebrev(donor_id, status, type, amount, minimal_income, started_at) values ($1, $2, $3, $4, $5, $6) returning *",
      [
        gavebrev.donor_id,
        GavebrevStatus.Created,
        gavebrev.type,
        gavebrev.amount,
        gavebrev.minimal_income,
        gavebrev.started_at,
      ]
    )
  ).rows[0];
}

export async function setGavebrevStatus(
  client: PoolClient,
  id: string,
  status: GavebrevStatus
): Promise<number> {
  return (
    await client.query(
      "update gavebrev set status = $1 where id = $2 returning 1",
      [status, id]
    )
  ).rows.length;
}

export async function findAllGavebrev(client: PoolClient): Promise<Gavebrev[]> {
  return (await client.query("select id, status from gavebrev")).rows;
}
