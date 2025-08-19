import type { Donation, DonationRecipient, PaymentGateway } from "../src";

export type Donor = {
  id: string;
  created_at: Date;
  updated_at: Date;
  name: string;
  email: string;
  address: string;
  postcode: string;
  city: string;
  country: string;
  tin: string;
  birthday: Date;
};

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

export type Earmark = {
  donation_id: string;
  recipient: DonationRecipient;
  percentage: number;
};
