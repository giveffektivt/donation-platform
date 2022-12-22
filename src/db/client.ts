import { Pool, PoolClient, types } from "pg";

// Parse numeric values into TypeScript numbers
types.setTypeParser(1700, (val) => parseFloat(val));

let pool: Pool;

export async function dbClient() {
  if (!pool) {
    pool = new Pool();
  }
  return await pool.connect();
}

export function dbRelease(client: PoolClient | null) {
  if (client) {
    client.release();
  }
}

export async function dbBeginTransaction(client: PoolClient) {
  return await client.query("begin");
}

export async function dbCommitTransaction(client: PoolClient) {
  return await client.query("commit");
}

export async function dbRollbackTransaction(client: PoolClient) {
  return await client.query("rollback");
}

export async function dbExecuteInTransaction<T>(
  fn: (db: PoolClient) => Promise<T>
): Promise<T> {
  const db = await dbClient();
  try {
    await dbBeginTransaction(db);
    const result = await fn(db);
    await dbCommitTransaction(db);
    return result;
  } catch (err) {
    await dbRollbackTransaction(db);
    throw err;
  } finally {
    dbRelease(db);
  }
}
