import {
  ChargeStatus,
  type DonationWithGatewayInfoBankTransfer,
  dbExecuteInTransaction,
  insertCharge,
  setDonationBetalingsserviceMetadata,
} from "src";
import { betalingsserviceCreateMandate } from "./api";

export async function registerBetalingsserviceMandate(
  donation: DonationWithGatewayInfoBankTransfer,
  input: { tin: string; regNo: string; accountNo: string },
): Promise<{ uuid: string; statusCode: string }> {
  const creditorsDebtorReference = donation.gateway_metadata.bs_reference;

  if (!creditorsDebtorReference) {
    throw new Error(
      `Missing Betalingsservice reference for donation ${donation.id}`,
    );
  }

  const mandate = await betalingsserviceCreateMandate({
    cprNumber: input.tin,
    regNo: input.regNo,
    accountNo: input.accountNo,
    creditorsDebtorReference,
  });

  await dbExecuteInTransaction(async (db) => {
    await setDonationBetalingsserviceMetadata(db, donation.id, {
      uuid: mandate.uuid,
      status_code: mandate.statusCode,
      reg_no: input.regNo,
      account_no: input.accountNo,
    });
    await insertCharge(db, {
      donation_id: donation.id,
      status: ChargeStatus.Created,
    });
  });

  return mandate;
}
