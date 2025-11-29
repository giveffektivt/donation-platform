import { importSPKI, jwtVerify } from "jose";
import jwksClient from "jwks-rsa";

const client = jwksClient({
  jwksUri: `${process.env.AUTH0_ISSUER_BASE_URL}/.well-known/jwks.json`,
});

async function getKey(header: any) {
  const key = await client.getSigningKey(header.kid);
  const publicKey = key.getPublicKey();
  return importSPKI(publicKey, "RS256");
}

async function verifyJwt(token: string) {
  const { payload } = await jwtVerify(token, getKey, {
    issuer: `${process.env.AUTH0_ISSUER_BASE_URL}/`,
    audience: process.env.AUTH0_AUDIENCE,
  });

  return payload;
}

export async function verifyJwtBearerToken(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice(7);
  return await verifyJwt(token);
}
