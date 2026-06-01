import type { PoolClient } from "pg";
import {
  type Charge,
  ChargeStatus,
  dbExecuteInTransaction,
  type DonationWithGatewayInfoBankTransfer,
  insertCharge,
  type NewDonation,
  registerDonationViaBankTransfer,
  setChargeOpenBankingPaymentId,
} from "src";
import { openBankingCreateAcceptPayment } from "./api";

export async function registerBankDonation(payload: NewDonation): Promise<{
  donation: DonationWithGatewayInfoBankTransfer;
  charge: Charge;
}> {
  return dbExecuteInTransaction(async (db) =>
    registerWithWaitingCharge(db, payload),
  );
}

export async function createOpenBankingPaymentForCharge(
  donation: DonationWithGatewayInfoBankTransfer,
  charge: Charge,
  redirectUrl: string,
): Promise<{ paymentId: string; authorizationUrl: string }> {
  const { paymentId, authorizationUrl } = await openBankingCreateAcceptPayment({
    amount: donation.amount,
    currency: "DKK",
    reference: charge.short_id,
    redirectUrl,
  });

  await dbExecuteInTransaction((db) =>
    setChargeOpenBankingPaymentId(db, charge.id, paymentId),
  );

  return { paymentId, authorizationUrl };
}

async function registerWithWaitingCharge(
  db: PoolClient,
  payload: NewDonation,
): Promise<{
  donation: DonationWithGatewayInfoBankTransfer;
  charge: Charge;
}> {
  const donation = await registerDonationViaBankTransfer(db, payload);
  const charge = await insertCharge(db, {
    donation_id: donation.id,
    status: ChargeStatus.Waiting,
  });
  return { donation, charge };
}
