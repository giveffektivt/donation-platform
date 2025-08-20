// Postgres inferred some of the numeric values to be a BigInt type,
// which map to string type in typescript / JSON.stringify.
//
// This doesn't matter while this API is consumed by humans,
// but if we ever need to have proper numeric types, let's change type on DB at that time.

import type { DonationRecipient } from "src/donation";

export type Kpi = {
  dkk_total: number;
  dkk_total_ops: number;
  dkk_pending_transfer: number;
  dkk_last_30_days: number;
  dkk_recurring_next_year: number;
  members_confirmed: number;
  members_pending_renewal: number;
  monthly_donors: number;
  number_of_donors: number;
  is_max_tax_deduction_known: number;
  oldest_stopped_donation_age: number;
  missing_gavebrev_income_proof: number;
};

export type PendingDistribution = {
  recipient: string;
  dkk_total: number;
  payments_total: number;
};

export type TransferredDistribution = {
  id: string;
  earmark: DonationRecipient;
  recipient: string;
  unit: string;
  total_dkk: number;
  total_usd: number;
  unit_cost_external: number;
  unit_cost_conversion: number;
  unit_cost_dkk: number;
  unit_impact: number;
  life_cost_external: number;
  life_cost_dkk: number;
  life_impact: number;
  computed_at: string;
  transferred_at: string;
};

export type TimeDistribution = {
  date: string;
  dkk_total: number;
  payments_total: number;
  value_added: number;
  value_added_monthly: number;
  value_added_once: number;
  value_lost: number;
  monthly_donors: number;
};

export type FundraiserKpi = {
  created_at: string;
  message: string;
  frequency: string;
  cancelled: boolean;
  total_amount: number;
};
