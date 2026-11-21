import { z } from "zod";

const companyResponse = z.object({
  vat: z.union([z.number(), z.string()]),
  name: z.string().trim().min(1),
  address: z.string().trim().min(1),
  addressco: z.string().trim().nullish(),
  zipcode: z.string().trim().min(1),
  city: z.string().trim().min(1),
});

export type DanishCompany = {
  cvr: string;
  name: string;
  address: string;
  zipcode: string;
  city: string;
};

export function companyAddressLines(company: DanishCompany) {
  return [
    company.name,
    ...company.address.split("\n"),
    `${company.zipcode} ${company.city}`,
    `CVR: ${company.cvr}`,
  ];
}

export async function lookupDanishCompany(
  cvr: string,
): Promise<DanishCompany | null> {
  const url = new URL("https://cvrapi.dk/api");
  url.search = new URLSearchParams({ search: cvr, country: "dk" }).toString();
  const response = await fetch(url, {
    headers: { "User-Agent": "Giv Effektivt - Donation platform" },
    signal: AbortSignal.timeout(5_000),
    cache: "no-store",
    redirect: "error",
  });
  if (!response.ok)
    throw new Error(`CVR lookup returned HTTP ${response.status}`);

  const body = await response.json();
  if (body?.error === "NOT_FOUND") return null;

  const company = companyResponse.safeParse(body);
  if (!company.success || String(company.data.vat) !== cvr) {
    throw new Error("CVR lookup did not return matching company details");
  }

  const { name, address, addressco, zipcode, city } = company.data;
  return {
    cvr,
    name,
    address: addressco ? `C/O ${addressco}\n${address}` : address,
    zipcode,
    city,
  };
}
