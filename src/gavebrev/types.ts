export enum GavebrevType {
  Percentage = "percentage",
  Amount = "amount",
}

export type Gavebrev = {
  id: string;
  donor_id: string;
  short_id: string;
  type: GavebrevType;
  amount: number;
  minimal_income: number;
  cancelled: boolean;
  started_at: Date;
  created_at: Date;
  updated_at: Date;
};
