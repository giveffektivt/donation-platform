import { Donation, DonorWithSensitiveInfo } from "../src";

export type DonationWithGatewayInfoAny = Donation & {
  gateway_metadata: any;
};

export type DonorWithOldId = DonorWithSensitiveInfo & {
  _old_id: string;
};
