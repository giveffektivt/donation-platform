import { DonationGatewayMetadataScanpay, DonationRecipient } from "src";

export enum ChargeStatus {
  Created = "created",
  Waiting = "waiting",
  Charged = "charged",
  Refunded = "refunded",
  Error = "error",
}

export type Charge = {
  id: string;
  donation_id: string;
  short_id: string;
  status: ChargeStatus;
  created_at: Date;
  updated_at: Date;
};

export type ChargeWithGatewayInfo = Charge & {
  gateway_metadata: any;
  gateway_response: any;
};

export type ChargeToCharge = {
  id: string;
  short_id: string;
  amount: number;
  email: string;
  recipient: DonationRecipient;
  gateway_metadata?: ChargeGatewayMetadataScanpay;
  donation_gateway_metadata?: DonationGatewayMetadataScanpay;
};

export type ChargeGatewayMetadataScanpay = {
  idempotency_key: string;
};
