import { PoolClient } from "pg";
import { Gavebrev } from "src";

export async function insertGavebrev(
  client: PoolClient,
  gavebrev: Partial<Gavebrev>
): Promise<Gavebrev> {
  return (
    await client.query(
      "insert into gavebrev(donor_id, type, amount, minimal_income, started_at) values ($1, $2, $3, $4, $5) returning *",
      [
        gavebrev.donor_id,
        gavebrev.type,
        gavebrev.amount,
        gavebrev.minimal_income,
        gavebrev.started_at,
      ]
    )
  ).rows[0];
}
