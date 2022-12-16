import moment from "moment";
import { PoolClient } from "pg";
import {
  ChargeStatus,
  ChargeToChargeQuickpay,
  setChargeStatus,
} from "src/charge";
import {
  DonationFrequency,
  DonationRecipient,
  DonationWithGatewayInfoQuickpay,
  PaymentMethod,
} from "src/donation";

/** Make a request to Quickpay API to get Quickpay ID for a one time payment */
export async function quickpayCreatePayment(
  charge_short_id: string,
  donation: DonationWithGatewayInfoQuickpay
): Promise<string> {
  const response = await request(
    "POST",
    "payments",
    buildAuthorizationHeader(donation.recipient),
    {
      currency: "dkk",
      order_id: charge_short_id,
      basket: [
        {
          qty: 1,
          item_no: 1,
          item_name: "Giv Effektivt donation",
          item_price: donation.amount * 100,
          vat_rate: 0,
        },
      ],
      text_on_statement: "giveffektivt.dk",
    }
  );

  return response.id;
}

/** Make a request to Quickpay API to get Quickpay ID for a subscription */
export async function quickpayCreateSubscription(
  donation: DonationWithGatewayInfoQuickpay
): Promise<string> {
  const description = `Giv Effektivt ${
    donation.recipient === DonationRecipient.GivEffektivt
      ? "medlem"
      : "donation"
  }`;

  const response = await request(
    "POST",
    "subscriptions",
    buildAuthorizationHeader(donation.recipient),
    {
      currency: "dkk",
      order_id: donation.gateway_metadata.quickpay_order,
      description,
      text_on_statement: "giveffektivt.dk",
    }
  );

  return response.id;
}

/** Make a request to Quickpay API to get a one time payment link */
export async function quickpayOneTimeUrl(
  donation: DonationWithGatewayInfoQuickpay,
  successUrl: string
): Promise<string> {
  const isMobilePay = donation.method === PaymentMethod.MobilePay;

  const response = await request(
    "PUT",
    `payments/${donation.gateway_metadata.quickpay_id}/link`,
    buildAuthorizationHeader(donation.recipient),
    {
      amount: donation.amount * 100,
      continue_url: successUrl,
      callback_url: process.env.QUICKPAY_CALLBACK_URL,
      auto_capture: true,
      language: "da",
      payment_methods: isMobilePay ? "mobilepay" : "",
    }
  );

  return response.url;
}

/** Make a request to Quickpay API to get a subscription link */
export async function quickpaySubscriptionUrl(
  donation: DonationWithGatewayInfoQuickpay,
  successUrl: string
): Promise<string> {
  const isMobilePay = donation.method === PaymentMethod.MobilePay;

  const response = await request(
    "PUT",
    `subscriptions/${donation.gateway_metadata.quickpay_id}/link`,
    buildAuthorizationHeader(donation.recipient),
    {
      amount: donation.amount * 100,
      continue_url: successUrl,
      callback_url: process.env.QUICKPAY_CALLBACK_URL,
      language: "da",
      payment_methods: isMobilePay ? "mobilepay-subscriptions" : "",
    }
  );

  return response.url;
}

/** Make a request to Quickpay API to charge a subscription */
export async function quickpayChargeSubscription(
  db: PoolClient,
  charge: ChargeToChargeQuickpay
) {
  if (!charge.donation_gateway_metadata?.quickpay_id) {
    console.error(
      `Charge with ID '${charge.id}' does not have a corresponding Quickpay ID that is required for charging`
    );
    await setChargeStatus(db, { id: charge.id, status: ChargeStatus.Error });
    return;
  }

  const isMobilePay = charge.method === PaymentMethod.MobilePay;

  let status = ChargeStatus.Waiting;

  try {
    await request(
      "POST",
      `subscriptions/${charge.donation_gateway_metadata.quickpay_id}/recurring`,
      buildAuthorizationHeader(charge.recipient),
      {
        amount: charge.amount * 100,
        order_id: charge.short_id,
        auto_capture: true,
        auto_capture_at: isMobilePay
          ? moment().add(49, "hour").toDate() // must be at least 2 days in the future for MobilePay Subscriptions
          : undefined,
        text_on_statement: "giveffektivt.dk",
        description: `Giv Effektivt ${charge.short_id}`,
      },
      !isMobilePay // MobilePay Subscriptions sends empty response on success
    );
  } catch (err: any) {
    console.error(`Error while charging ID '${charge.id}':`, err);
    status = ChargeStatus.Error;
  }

  await setChargeStatus(db, { id: charge.id, status });
}

async function request(
  method: "POST" | "PUT",
  endpoint: string,
  authorization: string,
  body: any,
  parseResponse = true
) {
  const response = await fetch(`https://api.quickpay.net/${endpoint}`, {
    method,
    headers: {
      "Accept-Version": "v10",
      "Content-Type": "application/json",
      Authorization: authorization,
      "QuickPay-Callback-Url": process.env.QUICKPAY_CALLBACK_URL,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`${response.statusText}: ${await response.text()}`);
  }

  if (parseResponse) {
    return await response.json();
  }
}

function buildAuthorizationHeader(recipient: DonationRecipient) {
  const apiKey =
    recipient === DonationRecipient.GivEffektivt
      ? process.env.QUICKPAY_MEMBERSHIP_API_KEY
      : process.env.QUICKPAY_DONATION_API_KEY;

  if (!apiKey) {
    throw new Error(`No Quickpay API key defined for recipient ${recipient}`);
  }

  const base64key = Buffer.from(`:${apiKey}`).toString("base64");
  return `Basic ${base64key}`;
}
