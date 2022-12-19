import { Donation, DonorWithSensitiveInfo, PaymentGateway } from "../src";

export type DonationWithGatewayInfoAny = Donation & {
  gateway_metadata: any;
};

export type DonorWithOldId = DonorWithSensitiveInfo & {
  _old_id: string;
};

export type GatewayWebhook = {
  gateway: PaymentGateway;
  payload: object;
};
