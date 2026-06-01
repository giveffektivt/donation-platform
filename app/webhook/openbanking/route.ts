import {
  ChargeStatus,
  DonationFrequency,
  EmailedStatus,
  PaymentGateway,
  dbClient,
  dbRelease,
  getChargeByOpenBankingPaymentId,
  logError,
  openBankingGetAcceptPaymentStatus,
  sendPaymentEmail,
  setChargeStatus,
  setDonationEmailed,
  verifyOpenBankingWebhookSignature,
} from "src";
import { insertGatewayWebhook } from "src/gateways/repository";

const SUCCESS_STATUSES = new Set(["Executed", "Authorized"]);
const FAILURE_STATUSES = new Set(["Failed", "Rejected", "Expired"]);

export async function POST(req: Request) {
  let db = null;
  try {
    const body = await req.text();
    const signature = req.headers.get("x-viia-signature");

    if (!verifyOpenBankingWebhookSignature(body, signature)) {
      throw new Error("Open banking webhook has invalid signature");
    }

    db = await dbClient();
    await insertGatewayWebhook(db, PaymentGateway.BankTransfer, body);

    const payload = JSON.parse(body);
    const event =
      payload.acceptPaymentUpdatedWebhook ??
      payload.acceptPaymentCreatedWebhook;
    const paymentId: string | undefined = event?.data?.paymentId;

    if (!paymentId) {
      return Response.json({ message: "OK" });
    }

    const charge = await getChargeByOpenBankingPaymentId(db, paymentId);
    if (!charge) {
      logError(`open-banking webhook: charge not found for ${paymentId}`);
      return Response.json({ message: "OK" });
    }

    const { status } = await openBankingGetAcceptPaymentStatus(paymentId);

    if (SUCCESS_STATUSES.has(status)) {
      await setChargeStatus(db, {
        id: charge.id,
        status: ChargeStatus.Charged,
      });
    } else if (FAILURE_STATUSES.has(status)) {
      await setChargeStatus(db, { id: charge.id, status: ChargeStatus.Error });
      await maybeSendBetalingsserviceFallbackEmail(db, charge.donation_id);
    }

    return Response.json({ message: "OK" });
  } catch (err) {
    logError("openbanking/webhook:", err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}

async function maybeSendBetalingsserviceFallbackEmail(
  db: import("pg").PoolClient,
  donationId: string,
) {
  const result = await db.query(
    `select d.id, d.amount, d.frequency, d.tax_deductible, d.emailed,
            p.email,
            case when count(e.recipient) = 1 then max(e.recipient) end as recipient
     from donation d
     join donor p on p.id = d.donor_id
     left join earmark e on e.donation_id = d.id
     where d.id = $1
       and d.frequency = $2
       and d.gateway_metadata ? 'bs_uuid'
     group by d.id, p.email`,
    [donationId, DonationFrequency.Monthly],
  );
  const row = result.rows[0];
  if (!row || row.emailed !== EmailedStatus.No) return;

  try {
    await setDonationEmailed(db, donationId, EmailedStatus.Attempted);
    await sendPaymentEmail({
      id: row.id,
      email: row.email,
      amount: Number(row.amount),
      recipient: row.recipient ?? undefined,
      frequency: row.frequency,
      tax_deductible: row.tax_deductible,
    });
    await setDonationEmailed(db, donationId, EmailedStatus.Yes);
  } catch (err) {
    logError(
      `open-banking webhook: failed BS fallback email ${donationId}`,
      err,
    );
  }
}
