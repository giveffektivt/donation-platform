import type { PoolClient } from "pg";
import { type CrmExport, getCrmExport } from "src";

export async function ExportToCrm(db: PoolClient) {
  const entries = await getCrmExport(db);
  exportToHubspot(entries);
  exportToBrevo(entries);
}

async function exportToHubspot(entries: CrmExport[]) {
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
      er_sidste_donation_fradragsberettiget: entry.last_donation_tax_deductible,
      sidste_donationsoeremaerkning: entry.last_donated_recipient,
      totalt_doneret: entry.total_donated,
      antal_donationer: entry.donations_count,
      medlem: entry.is_member,
    },
  }));

  const batchSize = 100;
  const totalBatches = Math.ceil(entries.length / batchSize);

  const batchPromises = Array.from({ length: totalBatches }, (_, i) => {
    const batch = payloads.slice(i * batchSize, (i + 1) * batchSize);
    return uploadBatchToHubspot(batch);
  });

  await Promise.all(batchPromises);
}

async function exportToBrevo(entries: CrmExport[]) {
  const toDate = (date: Date | null) => date?.toISOString()?.split("T")[0];
  const payloads = entries.map((entry) => ({
    email: entry.email,
    attributes: {
      ...(entry.name ? { FIRSTNAME: entry.name } : {}),
      DATO_FOR_OPRETTELSE: toDate(entry.registered_at),
      SIDSTE_DONATIONSDATO: toDate(entry.last_donated_at),
      SIDSTE_DONATIONSBELOB: entry.last_donated_amount,
      SIDSTE_DONATIONSFREKVENS: entry.last_donated_frequency,
      SIDSTE_DONATIONSMETODE: entry.last_donated_method,
      ER_SIDSTE_DONATION_OPSAGT: entry.last_donation_cancelled,
      ER_SIDSTE_DONATION_FRADRAGSBERETTIGET: entry.last_donation_tax_deductible,
      SIDSTE_DONATIONSOEREMAERKNING: entry.last_donated_recipient,
      TOTALT_DONERET: entry.total_donated,
      ANTAL_DONATIONER: entry.donations_count,
      MEDLEM: entry.is_member,
    },
  }));

  await uploadBatchToBrevo(payloads);
}

async function uploadBatchToHubspot(batch: object[]) {
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

async function uploadBatchToBrevo(batch: object[]) {
  const response = await fetch(`${process.env.BREVO_API_URL}/contacts/import`, {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      disableNotification: true,
      updateExistingContacts: true,
      emptyContactsAttributes: false,
      jsonBody: batch,
      listIds: (process.env.BREVO_LIST_IDS ?? "")
        .split(",")
        .map((id) => Number(id.trim()))
        .filter((id) => !Number.isNaN(id)),
    }),
  });

  if (!response.ok) {
    throw await response.text();
  }
}
