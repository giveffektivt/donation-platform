import {
  type ChargeToChargeQuickpay,
  dbExecuteInTransaction,
  getChargesToCharge,
  logError,
  PaymentGateway,
  quickpayChargeSubscription,
} from "src";

export async function charge() {
  dbExecuteInTransaction(async (db) => {
    for (const charge of await getChargesToCharge(db)) {
      try {
        switch (charge.gateway) {
          case PaymentGateway.Quickpay:
            await quickpayChargeSubscription(
              db,
              charge as ChargeToChargeQuickpay,
            );
            break;
          default:
            throw new Error(`Unsupported gateway: ${charge.gateway}`);
        }
      } catch (err) {
        logError(`Error charging ID '${charge.id}'`, err);
      }
    }
  });
}
