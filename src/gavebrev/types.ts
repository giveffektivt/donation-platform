export enum GavebrevStatus {
  Created = "created",
  Rejected = "rejected",
  Signed = "signed",
  Error = "error",
}

export enum GavebrevType {
  Percentage = "percentage",
  Amount = "amount",
}

export type Gavebrev = {
  id: string;
  donor_id: string;
  status: GavebrevStatus;
  type: GavebrevType;
  amount: number;
  minimal_income: number;
  started_at: Date;
  stopped_at: Date;
  created_at: Date;
  updated_at: Date;
};

export type GavebrevCheckin = {
  id: string;
  donor_id: string;
  year: number;
  income_inferred?: number;
  income_preliminary?: number;
  income_verified?: number;
  limit_normal_donation?: number | null;
  created_at: Date;
  updated_at: Date;
};
