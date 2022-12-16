import {
  DonationGatewayMetadataQuickpay,
  DonationGatewayMetadataScanpay,
  DonationRecipient,
  PaymentGateway,
  PaymentMethod,
} from "src";

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
  gateway: PaymentGateway;
  method: PaymentMethod;
  recipient: DonationRecipient;
};

export type ChargeToChargeScanpay = ChargeToCharge & {
  gateway_metadata: ChargeGatewayMetadataScanpay;
  donation_gateway_metadata: DonationGatewayMetadataScanpay;
};

export type ChargeToChargeQuickpay = ChargeToCharge & {
  donation_gateway_metadata: DonationGatewayMetadataQuickpay;
};

export type ChargeGatewayMetadataScanpay = {
  idempotency_key: string;
};
