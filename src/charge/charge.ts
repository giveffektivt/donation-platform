import {
  ChargeToChargeQuickpay,
  ChargeToChargeScanpay,
  dbExecuteInTransaction,
  getChargesToCharge,
  PaymentGateway,
  quickpayChargeSubscription,
  scanpayChargeSubscription,
} from "src";

export async function charge() {
  dbExecuteInTransaction(async (db) => {
    for (let charge of await getChargesToCharge(db)) {
      try {
        switch (charge.gateway) {
          case PaymentGateway.Quickpay:
            await quickpayChargeSubscription(
              db,
              charge as ChargeToChargeQuickpay
            );
            break;
          case PaymentGateway.Scanpay:
            await scanpayChargeSubscription(
              db,
              charge as ChargeToChargeScanpay
            );
            break;
          default:
            throw new Error(`Unsupported gateway: ${charge.gateway}`);
        }
      } catch (err) {
        console.error(`Error charging ID '${charge.id}'`, err);
      }
    }
  });
}
