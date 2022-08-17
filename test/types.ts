import { Donation } from "../src";

export type DonationWithGatewayInfoAny = Donation & {
  gateway_metadata: any;
};
