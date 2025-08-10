import scanpay from "scanpay";
import { Charge, Donation, DonorContact } from "src";

const client = scanpay(process.env.SCANPAY_KEY);

/** Make a request to Scanpay API to get a one time payment link*/
export async function scanpayOneTimeUrl(
  donor: DonorContact,
  donation: Donation,
  charge: Charge,
  customerIp: string,
  successUrl: string
): Promise<string> {
  const options = {
    hostname: process.env.SCANPAY_HOSTNAME,
    headers: {
      "X-Cardholder-IP": customerIp,
    },
  };

  const order = {
    orderid: charge.short_id,
    language: "da",
    successurl: successUrl,
    items: [
      {
        name: `Donation to ${donation.recipient}`,
        total: `${donation.amount} DKK`,
      },
    ],
    billing: {
      email: donor.email,
      country: "DK",
    },
    autocapture: true,
  };

  const { url } = await client.paylink.create(order, options);
  return url;
}

/** Make a request to Scanpay API to get a subscription link*/
export async function scanpaySubscriptionUrl(
  donor: DonorContact,
  donation: Donation,
  customerIp: string,
  successUrl: string
): Promise<string> {
  const options = {
    hostname: process.env.SCANPAY_HOSTNAME,
    headers: {
      "X-Cardholder-IP": customerIp,
    },
  };

  const order = {
    language: "da",
    successurl: successUrl,
    subscriber: {
      ref: donation.id,
    },

    billing: {
      email: donor.email,
      country: "DK",
    },
  };

  const { url } = await client.subscriber.create(order, options);
  return url;
}
