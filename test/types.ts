import { Donation, Donor, PaymentGateway } from "../src";

export type DonationWithGatewayInfoAny = Donation & {
  gateway_metadata: any;
};

export type GatewayWebhook = {
  gateway: PaymentGateway;
  payload: object;
};

export type TaxReportLine = {
  tin: string;
  ll8a_or_gavebrev: string;
  total: number;
  aconto_debt: number;
};

export type OfficialTaxReportLine = {
  donor_cpr: string;
  ll8a_or_gavebrev: string;
  total: number;
  year: number;
  blank: string;
  const: number;
  ge_cvr: number;
  ge_notes: string;
  rettekode: number;
};
