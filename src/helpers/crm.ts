import type { PoolClient } from "pg";
import { type CrmExport, getCrmExport } from "src";

export async function ExportToCrm(db: PoolClient) {
  const entries = await getCrmExport(db);
  exportToBrevo(entries);
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
      SIDSTE_DONATIONSOEREMAERKNING: entry.last_donated_recipient,
      ER_SIDSTE_DONATION_OPSAGT: entry.last_donation_cancelled,
      ER_SIDSTE_DONATION_FRADRAGSBERETTIGET: entry.last_donation_tax_deductible,
      FOERSTE_DONATIONSDATO: toDate(entry.first_donation_at),
      FOERSTE_MAANEDLIG_DONATIONSDATO: toDate(entry.first_monthly_donation_at),
      FOERSTE_MEDLEMSKABSDATO: toDate(entry.first_membership_at),
      TOTALT_DONERET: entry.total_donated,
      ANTAL_DONATIONER: entry.donations_count,
      MEDLEM: entry.is_member,
      GAVEBREV: entry.has_gavebrev,
      ALDER: entry.age,
      DONERET_AVITAMIN: entry.vitamin_a_amount,
      IMPACT_AVITAMIN: entry.vitamin_a_units,
      DONERET_INCENTIVES: entry.vaccinations_amount,
      IMPACT_INCENTIVES: entry.vaccinations_units,
      DONERET_MYGGENET: entry.bednets_amount,
      IMPACT_MYGGENET: entry.bednets_units,
      DONERET_MALARIAMEDICIN: entry.malaria_medicine_amount,
      IMPACT_MALARIAMEDICIN: entry.malaria_medicine_units,
      DONERET_KONTANTOVERFOERSLER: entry.direct_transfer_amount,
      IMPACT_KONTANTOVERFOERSLER: entry.direct_transfer_units,
      DONERET_ORMEKURE: entry.deworming_amount,
      IMPACT_ORMEKURE: entry.deworming_units,
      LIVES_SAVED: entry.lives,
    },
  }));

  await uploadBatchToBrevo(payloads);
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
