import crypto from "node:crypto";
import {
  dbClient,
  dbRelease,
  logRequestError,
  PaymentGateway,
  quickpayHandleChange,
} from "src";
import { insertGatewayWebhook } from "src/gateways/repository";

export async function POST(req: Request) {
  let db = null;
  let payload: unknown;
  try {
    if (
      !process.env.QUICKPAY_DONATION_PRIVATE_KEY ||
      !process.env.QUICKPAY_MEMBERSHIP_PRIVATE_KEY
    ) {
      throw new Error("Quickpay private keys are not defined");
    }

    const body = await req.text();

    // Validate that the request comes from Quickpay
    const donationHash = crypto
      .createHmac("sha256", process.env.QUICKPAY_DONATION_PRIVATE_KEY)
      .update(body)
      .digest("hex");

    const membershipHash = crypto
      .createHmac("sha256", process.env.QUICKPAY_MEMBERSHIP_PRIVATE_KEY)
      .update(body)
      .digest("hex");

    const bodyHash = req.headers.get("Quickpay-Checksum-Sha256");

    if (bodyHash !== donationHash && bodyHash !== membershipHash) {
      throw new Error("Quickpay callback has invalid signature");
    }

    const change = JSON.parse(body);
    payload = change;
    db = await dbClient();

    // Store gateway webhook payload
    await insertGatewayWebhook(db, PaymentGateway.Quickpay, body);

    // Process the change
    await quickpayHandleChange(db, change);

    return Response.json({ message: "OK" });
  } catch (err) {
    await logRequestError("api/quickpay-callback:", err, payload);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
