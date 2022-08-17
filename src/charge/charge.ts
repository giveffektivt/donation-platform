import { chargeWithScanPay, dbClient, getChargesToCharge } from "src";

export async function charge() {
  const db = await dbClient();

  try {
    for (let charge of await getChargesToCharge(db)) {
      try {
        await chargeWithScanPay(db, charge);
      } catch (err) {
        console.error(`Error charging ID '${charge.id}'`, err);
      }
    }
  } finally {
    db.release();
  }
}
