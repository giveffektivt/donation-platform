// Postgres inferred some of the numeric values to be a BigInt type,
// which map to string type in typescript / JSON.stringify.
//
// This doesn't matter while this API is consumed by humans,
// but if we ever need to have proper numeric types, let's change type on DB at that time.

export type Kpi = {
  members_dk: number;
  donations_total: number;
  donations_recurring_per_year: number;
};

export type PendingDistribution = {
  recipient: string;
  dkk_total: number;
  payments_total: number;
};

export type TransferredDistribution = {
  recipient: string;
  dkk_total: number;
  payments_total: number;
};

export type TimeDistribution = {
  date: string;
  dkk_total: number;
  payments_total: number;
  value_added: number;
  value_lost: number;
};

export type FundraiserKpi = {
  created_at: string;
  message: string;
  frequency: string;
  cancelled: boolean;
  total_amount: number;
};
