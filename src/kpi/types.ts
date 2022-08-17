// Postgres inferred some of the numeric values to be a BigInt type,
// which map to string type in typescript / JSON.stringify.
//
// This doesn't matter while this API is consumed by humans,
// but if we ever need to have proper numeric types, let's change type on DB at that time.

export type Kpi = {
  members: number;
  donations_total: number;
  donations_monthly: number;
  verified_count_200: number;
  verified_total: number;
};

export type RecipientDistribution = {
  recipient: string;
  count: string;
  sum: number;
};
