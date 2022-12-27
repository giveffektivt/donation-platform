export enum GavebrevStatus {
  Created = "created",
  Rejected = "rejected",
  Active = "active",
  Cancelled = "cancelled",
  Completed = "completed",
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
  cancelled: boolean;
  started_at: Date;
  created_at: Date;
  updated_at: Date;
};
