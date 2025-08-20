import type { PoolClient } from "pg";
import {
  dbClient,
  dbExecuteInTransaction,
  dbRelease,
  findAllGavebrev,
  type Gavebrev,
  type GavebrevStatus,
  GavebrevType,
  registerGavebrev,
  type NewGavebrev,
  setGavebrevStatus,
  setGavebrevStopped,
} from "src";

export async function createGavebrev(
  submitData: NewGavebrev,
): Promise<string> {
  const gavebrev = await dbExecuteInTransaction(
    async (db) => await insertGavebrevData(db, submitData),
  );
  return gavebrev.id;
}

export async function updateGavebrevStatus(
  id: string,
  status: GavebrevStatus,
): Promise<boolean> {
  return await dbExecuteInTransaction(
    async (db) => await doUpdateGavebrevStatus(db, id, status),
  );
}

export async function stopGavebrev(id: string): Promise<boolean> {
  return await dbExecuteInTransaction(
    async (db) => await doStopGavebrev(db, id),
  );
}

export async function insertGavebrevData(
  db: PoolClient,
  submitData: NewGavebrev,
): Promise<Gavebrev> {
  return await registerGavebrev(db, {
    name: submitData.name,
    email: submitData.email,
    tin: submitData.tin,
    type: submitData.percentage ? GavebrevType.Percentage : GavebrevType.Amount,
    amount: submitData.percentage ?? submitData.amount ?? 0,
    minimal_income: submitData.minimalIncome,
    started_at: new Date(Date.UTC(submitData.startYear, 0, 1)),
    stopped_at: new Date(Date.UTC(submitData.startYear + 10, 0, 1)),
  });
}

export async function doUpdateGavebrevStatus(
  db: PoolClient,
  id: string,
  status: GavebrevStatus,
): Promise<boolean> {
  return 1 === (await setGavebrevStatus(db, id, status));
}

export async function doStopGavebrev(
  db: PoolClient,
  id: string,
): Promise<boolean> {
  return 1 === (await setGavebrevStopped(db, id, new Date()));
}

export async function listGavebrev(): Promise<Gavebrev[]> {
  const db = await dbClient();
  try {
    return await findAllGavebrev(db);
  } finally {
    dbRelease(db);
  }
}
