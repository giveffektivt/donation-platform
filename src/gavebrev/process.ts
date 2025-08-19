import type { PoolClient } from "pg";
import {
  dbClient,
  dbExecuteInTransaction,
  dbRelease,
  findAllGavebrev,
  type Gavebrev,
  GavebrevType,
  parseGavebrevStatus,
  registerGavebrev,
  type SubmitDataGavebrev,
  type SubmitDataGavebrevStatus,
  type SubmitDataGavebrevStop,
  setGavebrevStatus,
  setGavebrevStopped,
} from "src";

export async function createGavebrev(
  submitData: SubmitDataGavebrev,
): Promise<string> {
  const gavebrev = await dbExecuteInTransaction(
    async (db) => await insertGavebrevData(db, submitData),
  );
  return gavebrev.id;
}

export async function updateGavebrevStatus(
  submitData: SubmitDataGavebrevStatus,
): Promise<boolean> {
  return await dbExecuteInTransaction(
    async (db) => await doUpdateGavebrevStatus(db, submitData),
  );
}

export async function stopGavebrev(
  submitData: SubmitDataGavebrevStop,
): Promise<boolean> {
  return await dbExecuteInTransaction(
    async (db) => await doStopGavebrev(db, submitData),
  );
}

export async function insertGavebrevData(
  db: PoolClient,
  submitData: SubmitDataGavebrev,
): Promise<Gavebrev> {
  return await registerGavebrev(db, {
    name: submitData.name,
    email: submitData.email,
    tin: submitData.tin,
    type: submitData.percentage ? GavebrevType.Percentage : GavebrevType.Amount,
    amount: submitData.percentage || submitData.amount,
    minimal_income: submitData.minimalIncome,
    started_at: new Date(Date.UTC(submitData.startYear, 0, 1)),
    stopped_at: new Date(Date.UTC(submitData.startYear + 10, 0, 1)),
  });
}

export async function doUpdateGavebrevStatus(
  db: PoolClient,
  submitData: SubmitDataGavebrevStatus,
): Promise<boolean> {
  return (
    1 ===
    (await setGavebrevStatus(
      db,
      submitData.id,
      parseGavebrevStatus(submitData.status),
    ))
  );
}

export async function doStopGavebrev(
  db: PoolClient,
  submitData: SubmitDataGavebrevStop,
): Promise<boolean> {
  return 1 === (await setGavebrevStopped(db, submitData.id, new Date()));
}

export async function listGavebrev(): Promise<Gavebrev[]> {
  const db = await dbClient();
  try {
    return await findAllGavebrev(db);
  } finally {
    dbRelease(db);
  }
}
