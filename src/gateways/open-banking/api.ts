import { createHmac, timingSafeEqual } from "node:crypto";

export class OpenBankingError extends Error {
  constructor(
    public readonly httpStatus: number,
    message: string,
  ) {
    super(message);
  }
}

export type CreateAcceptPaymentInput = {
  amount: number;
  currency: string;
  reference: string;
  redirectUrl: string;
};

export type CreateAcceptPaymentResponse = {
  paymentId: string;
  authorizationUrl: string;
};

export type AcceptPaymentStatus =
  | "Initiated"
  | "AwaitingAuthorization"
  | "Authorized"
  | "Executed"
  | "Failed"
  | "Rejected"
  | "Expired"
  | string;

export async function openBankingCreateAcceptPayment(
  input: CreateAcceptPaymentInput,
): Promise<CreateAcceptPaymentResponse> {
  const body = {
    amount: input.amount.toFixed(2),
    currency: input.currency,
    schemeId: "DanishDomesticCreditTransfer",
    reference: formatOpenBankingReference(input.reference),
    destinationId: requireEnv("OPEN_BANKING_DESTINATION_ID"),
    redirectUrl: input.redirectUrl,
    preselectedCountry: "DK",
  };

  const json = await request("POST", "/v2/payments/accept", body);

  if (!json?.paymentId || !json?.authorizationUrl) {
    throw new OpenBankingError(
      502,
      `Unexpected response from Aiia: ${JSON.stringify(json)}`,
    );
  }

  return { paymentId: json.paymentId, authorizationUrl: json.authorizationUrl };
}

export async function openBankingGetAcceptPaymentStatus(
  paymentId: string,
): Promise<{ status: AcceptPaymentStatus; raw: any }> {
  const json = await request("GET", `/v2/payments/accept/${paymentId}`);
  return { status: json?.status ?? "Unknown", raw: json };
}

export function verifyOpenBankingWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (!signatureHeader) return false;
  const secret = requireEnv("OPEN_BANKING_WEBHOOK_SECRET");
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signatureHeader.trim();
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

async function request(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<any> {
  const baseUrl = requireEnv("OPEN_BANKING_BASE_URL");
  const clientId = requireEnv("OPEN_BANKING_CLIENT_ID");
  const clientSecret = requireEnv("OPEN_BANKING_CLIENT_SECRET");
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const json = text ? safeJson(text) : null;

  if (!response.ok) {
    throw new OpenBankingError(
      response.status,
      json?.message ?? text ?? response.statusText,
    );
  }

  return json;
}

export function formatOpenBankingReference(reference: string): string {
  const normalized = reference.replace(/[^a-zA-Z0-9]/g, "");

  if (normalized.length === 0 || normalized.length > 20) {
    throw new OpenBankingError(
      500,
      "Open banking reference must be 1-20 alphanumeric characters",
    );
  }

  return normalized;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
