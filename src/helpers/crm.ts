import type { PoolClient } from "pg";
import { getCrmExport } from "src";

export async function ExportToCrm(db: PoolClient) {
  const entries = await getCrmExport(db);

  const toDate = (date: Date | null) => date?.toISOString()?.split("T")[0];
  const payloads = entries.map((entry) => ({
    idProperty: "email",
    id: entry.email,
    properties: {
      ...(entry.name ? { firstname: entry.name } : {}),
      oprettelsesdato: toDate(entry.registered_at),
      email: entry.email,
      sidste_donationsdato: toDate(entry.last_donated_at),
      sidste_donationsbelob: entry.last_donated_amount,
      sidste_donationsfrekvens: entry.last_donated_frequency,
      sidste_donationsmetode: entry.last_donated_method,
      er_sidste_donation_opsagt: entry.last_donation_cancelled,
      school: entry.last_donated_recipient,
      totalt_doneret: entry.total_donated,
      medlem: entry.is_member,
    },
  }));

  const batchSize = 100;
  const totalBatches = Math.ceil(entries.length / batchSize);

  const batchPromises = Array.from({ length: totalBatches }, (_, i) => {
    const batch = payloads.slice(i * batchSize, (i + 1) * batchSize);
    return uploadBatchToCrm(batch);
  });

  await Promise.all(batchPromises);
}

export async function uploadBatchToCrm(batch: object[]) {
  const response = await fetch(
    `${process.env.HUBSPOT_API_URL}/crm/v3/objects/contacts/batch/upsert`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: batch }),
    },
  );

  if (!response.ok) {
    throw await response.text();
  }
}
