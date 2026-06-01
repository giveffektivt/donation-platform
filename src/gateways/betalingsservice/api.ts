import { randomUUID } from "node:crypto";
import oauth from "mastercard-oauth1-signer";

export class BetalingsserviceError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus: number,
    message: string,
  ) {
    super(message);
  }
}

export type CreateMandateInput = {
  cprNumber: string;
  regNo: string;
  accountNo: string;
  creditorsDebtorReference: string;
};

export type CreateMandateResponse = {
  uuid: string;
  statusCode: string;
};

export async function betalingsserviceCreateMandate(
  input: CreateMandateInput,
): Promise<CreateMandateResponse> {
  const baseUrl = requireEnv("BETALINGSSERVICE_BASE_URL");
  const pbsNumber = Number(requireEnv("BETALINGSSERVICE_PBS_NUMBER"));
  const debtorGroupNumber = Number(
    requireEnv("BETALINGSSERVICE_DEBTOR_GROUP_NUMBER"),
  );

  const uuid = randomUUID();
  const body = {
    uuid,
    debtorIdentity: { cprNumber: input.cprNumber.replace(/-/g, "") },
    debtorAccountInformation: {
      debtorRegNo: input.regNo,
      debtorAccountNo: input.accountNo,
    },
    creditorsDebtorReference: input.creditorsDebtorReference,
    creditorData: { pbsNumber, debtorGroupNumber },
  };

  const url = `${baseUrl}/delegated-mandates`;
  const payload = JSON.stringify(body);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: signRequest(url, "POST", payload),
    },
    body: payload,
  });

  const text = await response.text();
  const json = text ? safeJson(text) : null;

  if (!response.ok) {
    const code = json?.errorCode ?? `HTTP_${response.status}`;
    const message = json?.errorDescription ?? text ?? response.statusText;
    throw new BetalingsserviceError(code, response.status, message);
  }

  return {
    uuid: json?.uuid ?? uuid,
    statusCode: json?.statusCode ?? "RECEIVED",
  };
}

let cachedSigningKey: string | null = null;

function signRequest(url: string, method: string, payload: string): string {
  if (cachedSigningKey === null) {
    cachedSigningKey = Buffer.from(
      requireEnv("BETALINGSSERVICE_SIGNING_KEY_BASE64"),
      "base64",
    ).toString("utf8");
  }
  return oauth.getAuthorizationHeader(
    url,
    method,
    payload,
    requireEnv("BETALINGSSERVICE_CONSUMER_KEY"),
    cachedSigningKey,
  );
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
