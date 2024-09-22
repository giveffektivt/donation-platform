import type { PoolClient } from "pg";
import {
  ChargeStatus,
  getDonorIdByChargeShortId,
  insertInitialChargeQuickpay,
  PaymentMethod,
  type QuickpayChange,
  sendFailedRecurringDonationEmails,
  setChargeStatusByShortId,
  setDonationCancelledByQuickpayOrder,
  setDonationMethodByQuickpayOrder,
} from "src";

async function handleSubscription(db: PoolClient, change: QuickpayChange) {
  if (!change.accepted) {
    return;
  }

  if (process.env.VERCEL_ENV === "production" && change.test_mode) {
    console.error(
      `Quickpay subscription ${change.order_id} was paid using test card, ignoring.`,
    );
    return;
  }

  if (change.state === "cancelled") {
    console.log(`Cancelling Quickpay subscription ${change.order_id}`);
    await setDonationCancelledByQuickpayOrder(db, change.order_id);
    return;
  }

  if (change.acquirer === "mobilepaysubscriptions") {
    // User has an option to change payment type to MobilePay on Quickpay's side.
    // Ensure this is reflected in DB, as it is important for charging recurring MobilePay subscriptions.
    await setDonationMethodByQuickpayOrder(
      db,
      change.order_id,
      PaymentMethod.MobilePay,
    );
  }

  console.log(
    `Checking the need for initial charges for Quickpay subscription ${change.order_id}`,
  );
  if (await insertInitialChargeQuickpay(db, change.order_id)) {
    console.log(
      `Created initial charges for Quickpay subscription ${change.order_id}`,
    );
  }
}

/** Add gateway response to a charge */
async function handleCharge(db: PoolClient, change: QuickpayChange) {
  const [status, msg] = getChargeStatusFromOperations(change);
  if (status) {
    const isCardExpired =
      status === ChargeStatus.Error &&
      ["card expired", "card lost or stolen"].includes(msg.toLocaleLowerCase());

    const log =
      status === ChargeStatus.Error && !isCardExpired
        ? console.error
        : console.log;
    log(`Charge ${change.order_id} is now ${status} (${msg}) with Quickpay`);
    await setChargeStatusByShortId(db, {
      status,
      short_id: change.order_id,
    });

    if (isCardExpired) {
      const donorId = await getDonorIdByChargeShortId(db, change.order_id);
      await sendFailedRecurringDonationEmails(db, [donorId]);
    }
  }
}

/** run appropriate handler based on change type */
export async function quickpayHandleChange(
  db: PoolClient,
  change: QuickpayChange,
) {
  switch (change.type) {
    case "Payment":
      return await handleCharge(db, change);
    case "Subscription":
      return await handleSubscription(db, change);
  }
}

const getChargeStatusFromOperations = (
  change: QuickpayChange,
): [ChargeStatus | null, string] => {
  if (!(change.operations?.length > 0)) {
    return [null, ""];
  }

  const latest = change.operations?.sort((a, b) => b.id - a.id)[0];

  switch (latest?.qp_status_code) {
    case "40000":
      return [ChargeStatus.Error, latest.aq_status_msg];
    case "20000":
      switch (latest.type) {
        case "capture":
          return [ChargeStatus.Charged, latest.aq_status_msg];
        case "refund":
          return [ChargeStatus.Refunded, latest.aq_status_msg];
      }
  }
  return [null, ""];
};
