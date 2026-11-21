import type { PoolClient } from "pg";
import type { DonationToEmail } from "src/donation/types";
import type { DanishCompany } from "./cvr";

export type ReceiptPayment = Pick<
  DonationToEmail,
  "amount" | "earmarks" | "tax_deductible"
> & {
  short_id: string;
  charged_at: Date;
};

type CompanyCharge = ReceiptPayment &
  Pick<DonationToEmail, "email" | "frequency"> & {
    id: string;
    cvr: string;
    donor_id: string;
  };

export async function getCompanyCharges(db: PoolClient) {
  const { rows } = await db.query<CompanyCharge>(
    `select c.id, c.short_id, c.created_at as charged_at, p.tin as cvr,
            p.id as donor_id, p.email, d.amount, d.frequency, d.tax_deductible,
            (select jsonb_agg(jsonb_build_object('recipient', e.recipient, 'amount', e.amount)
                              order by e.recipient)
               from earmark e where e.donation_id = d.id) as earmarks
       from charge c
       join donation d on d.id = c.donation_id
       join donor p on p.id = d.donor_id
      where c.status = 'charged'
        and c.created_at <= now()
        and c.company_receipt_status = 'pending'
        and p.tin ~ '^[1-9][0-9]{7}$'
      order by c.created_at, c.id
      limit 10`,
  );
  return rows;
}

export async function lockCompanyDetails(
  db: PoolClient,
  charge: CompanyCharge,
) {
  const { rows } = await db.query<{
    [K in keyof DanishCompany]: DanishCompany[K] | null;
  }>(
    `select p.tin as cvr, p.name, p.address, p.postcode as zipcode, p.city
       from donor p
       join donation d on d.donor_id = p.id
       join charge c on c.donation_id = d.id
      where p.id = $1 and p.tin = $2 and c.id = $3
        and c.status = 'charged' and c.company_receipt_status = 'pending'
      for update of p, c skip locked`,
    [charge.donor_id, charge.cvr, charge.id],
  );
  return rows[0];
}

export async function saveCompanyDetails(
  db: PoolClient,
  donorId: string,
  company: DanishCompany,
) {
  await db.query(
    `update donor set name = $3, address = $4, postcode = $5, city = $6
      where id = $1 and tin = $2`,
    [
      donorId,
      company.cvr,
      company.name,
      company.address,
      company.zipcode,
      company.city,
    ],
  );
}

export async function setCompanyChargeReceiptStatus(
  db: PoolClient,
  chargeId: string,
  status: "attempted" | "not_found" | "failed",
) {
  const { rowCount } = await db.query(
    `update charge set company_receipt_status = $2
      where id = $1 and status = 'charged' and company_receipt_status = 'pending'`,
    [chargeId, status],
  );
  return rowCount === 1;
}

export async function markCompanyChargeReceiptSent(
  db: PoolClient,
  chargeId: string,
) {
  await db.query(
    `update charge set company_receipt_status = 'sent'
      where id = $1 and company_receipt_status = 'attempted'`,
    [chargeId],
  );
}
