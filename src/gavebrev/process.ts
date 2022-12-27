import { PoolClient } from "pg";
import {
  dbExecuteInTransaction,
  Gavebrev,
  GavebrevType,
  insertDonorWithSensitiveInfo,
  insertGavebrev,
  parseGavebrevStatus,
  setCreatedGavebrevStatus,
  SubmitDataGavebrev,
  SubmitDataGavebrevStatus,
} from "src";

export async function createGavebrev(
  submitData: SubmitDataGavebrev
): Promise<string> {
  const gavebrev = await dbExecuteInTransaction(
    async (db) => await insertGavebrevData(db, submitData)
  );
  return gavebrev.id;
}

export async function confirmGavebrev(
  submitData: SubmitDataGavebrevStatus
): Promise<boolean> {
  return await dbExecuteInTransaction(
    async (db) => await updateGavebrevStatus(db, submitData)
  );
}

export async function insertGavebrevData(
  db: PoolClient,
  submitData: SubmitDataGavebrev
): Promise<Gavebrev> {
  const donor = await insertDonorWithSensitiveInfo(db, {
    name: submitData.name,
    email: submitData.email,
    tin: submitData.tin,
  });

  const gavebrev = await insertGavebrev(db, {
    donor_id: donor.id,
    type: submitData.percentage ? GavebrevType.Percentage : GavebrevType.Amount,
    amount: submitData.percentage || submitData.amount,
    minimal_income: submitData.minimalIncome,
    started_at: new Date(Date.UTC(submitData.startYear, 0, 1)),
  });

  return gavebrev;
}

export async function updateGavebrevStatus(
  db: PoolClient,
  submitData: SubmitDataGavebrevStatus
): Promise<boolean> {
  return (
    1 ===
    (await setCreatedGavebrevStatus(
      db,
      submitData.id,
      parseGavebrevStatus(submitData.status)
    ))
  );
}
