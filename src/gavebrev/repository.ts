import { PoolClient } from "pg";
import {
  DonorWithSensitiveInfo,
  Gavebrev,
  GavebrevCheckin,
  GavebrevStatus,
} from "src";

export async function insertGavebrevDonor(
  client: PoolClient,
  donor: Partial<DonorWithSensitiveInfo>
): Promise<DonorWithSensitiveInfo> {
  return (
    await client.query(
      `with new_row as (
         insert into donor_with_sensitive_info (name, email, tin)
         select $1, $2, $3
         where not exists (select * from donor_with_sensitive_info p join gavebrev g on p.id = g.donor_id where p.tin = $3 limit 1)
         returning *
       )
       select * from new_row
       union
       select * from donor_with_sensitive_info where tin = $3`,
      [donor.name, donor.email, donor.tin]
    )
  ).rows[0];
}

export async function insertGavebrev(
  client: PoolClient,
  gavebrev: Partial<Gavebrev>
): Promise<Gavebrev> {
  return (
    await client.query(
      "insert into gavebrev(donor_id, status, type, amount, minimal_income, started_at, stopped_at) values ($1, $2, $3, $4, $5, $6, $7) returning *",
      [
        gavebrev.donor_id,
        GavebrevStatus.Created,
        gavebrev.type,
        gavebrev.amount,
        gavebrev.minimal_income,
        gavebrev.started_at,
        gavebrev.stopped_at,
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

export async function setGavebrevStopped(
  client: PoolClient,
  id: string,
  stoppedAt: Date
): Promise<number> {
  return (
    await client.query(
      "update gavebrev set stopped_at = $1 where id = $2 returning 1",
      [stoppedAt, id]
    )
  ).rows.length;
}

export async function findAllGavebrev(client: PoolClient): Promise<Gavebrev[]> {
  return (
    await client.query(
      "select id, status from gavebrev where stopped_at > now()"
    )
  ).rows;
}
