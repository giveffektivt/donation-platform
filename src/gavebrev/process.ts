import { PoolClient } from "pg";
import {
  dbExecuteInTransaction,
  Gavebrev,
  insertDonorWithSensitiveInfo,
  insertGavebrev,
  parseGavebrevType,
  SubmitDataGavebrev,
} from "src";

export async function processGavebrev(
  submitData: SubmitDataGavebrev
): Promise<string> {
  const gavebrev = await dbExecuteInTransaction(
    async (db) => await insertGavebrevData(db, submitData)
  );
  return gavebrev.short_id;
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
    type: parseGavebrevType(submitData.type),
    amount: submitData.amount,
    minimal_income: submitData.minimalIncome,
    started_at: new Date(Date.UTC(submitData.startYear, 0, 1)),
  });

  return gavebrev;
}
