import { PoolClient } from "pg";

export async function lockScanPaySeq(client: PoolClient) {
  return await client.query("select pg_advisory_lock(hashtext('scanpay_seq'))");
}

export async function unlockScanPaySeq(client: PoolClient) {
  return await client.query(
    "select pg_advisory_unlock(hashtext('scanpay_seq'))"
  );
}

export async function getLatestScanPaySeq(client: PoolClient): Promise<number> {
  return (await client.query("select max(value) from scanpay_seq")).rows[0].max;
}

export async function insertScanPaySeq(client: PoolClient, seq: number) {
  await client.query("insert into scanpay_seq(value) values($1)", [seq]);
}
