export enum DonationRecipient {
  GivEffektivtsMedlemskab = "Giv Effektivts medlemskab",

  GivEffektivtsAnbefaling = "Giv Effektivts anbefaling",
  MyggenetModMalaria = "Myggenet mod malaria",
  MedicinModMalaria = "Medicin mod malaria",
  VitaminModMangelsygdomme = "Vitamin mod mangelsygdomme",
  VaccinerTilSpædbørn = "Vacciner til spædbørn",
  KontantoverførslerTilVerdensFattigste = "Kontantoverførsler til verdens fattigste",
  GivEffektivtsArbejdeOgVækst = "Giv Effektivts arbejde og vækst",
}

export enum DonationFrequency {
  Once = "once",
  Monthly = "monthly",
  Yearly = "yearly",
  Match = "match",
}

export enum PaymentGateway {
  Quickpay = "Quickpay",
  Scanpay = "Scanpay",
  BankTransfer = "Bank transfer",
}

export enum PaymentMethod {
  CreditCard = "Credit card",
  MobilePay = "MobilePay",
  BankTransfer = "Bank transfer",
}

export enum EmailedStatus {
  No = "no",
  Attempted = "attempted",
  Yes = "yes",
}

export type Donation = {
  id: string;
  donor_id: string;
  emailed: EmailedStatus;
  amount: number;
  recipient: DonationRecipient;
  frequency: DonationFrequency;
  cancelled: boolean;
  gateway: PaymentGateway;
  method: PaymentMethod;
  tax_deductible: boolean;
  fundraiser_id: string;
  message: string;
  created_at: Date;
  updated_at: Date;
};

export type DonationWithGatewayInfoQuickpay = Donation & {
  gateway_metadata: DonationGatewayMetadataQuickpay;
};

export type DonationWithGatewayInfoScanpay = Donation & {
  gateway_metadata: DonationGatewayMetadataScanpay;
};

export type DonationWithGatewayInfoBankTransfer = Donation & {
  gateway_metadata: DonationGatewayMetadataBankTransfer;
};

export type DonationGatewayMetadataQuickpay = {
  quickpay_id: string;
  quickpay_order: string;
};

export type DonationGatewayMetadataScanpay = {
  scanpay_id: number;
};

export type DonationGatewayMetadataBankTransfer = {
  bank_msg: string;
};

export type DonationToEmail = {
  id: string;
  email: string;
  amount: number;
  recipient: DonationRecipient;
  frequency: DonationFrequency;
  tax_deductible: boolean;
};

export type FailedRecurringDonation = {
  failed_at: Date;
  charge_id: string;
  short_id: string;
  amount: number;
  method: PaymentMethod;
  gateway: PaymentGateway;
  donor_id: string;
  donor_name: string;
  donor_email: string;
  donation_id: string;
  recipient: DonationRecipient;
  frequency: DonationFrequency;
  tax_deductible: boolean;
  fundraiser_id: string;
  message: string;
};

export type FailedRecurringDonationToEmail = {
  donor_id: string;
  donor_name: string;
  donor_email: string;
  recipient: string;
  amount: number;
  payment_link: string;
};

export type BankTransferInfo = {
  amount: number;
  msg: string;
};

export type Fundraiser = {
  id: string;
  email: string;
  title: string;
  has_match: boolean;
  match_currency: string | null;
  key: string;
  created_at: Date;
  updated_at: Date;
};

export type CrmExport = {
  email: string;
  registered_at: Date;
  name: string;
  total_donated: number;
  donations_count: number;
  last_donated_amount: number;
  last_donated_method: string;
  last_donated_frequency: DonationFrequency;
  last_donated_recipient: DonationRecipient;
  last_donation_cancelled: boolean;
  last_donation_tax_deductible: boolean;
  last_donated_at: Date;
  first_membership_at: Date;
  first_donation_at: Date;
  first_monthly_donation_at: Date;
  is_member: boolean;
  has_gavebrev: boolean;
  age: number;
  cvr: string;
  vitamin_a_amount: number;
  vitamin_a_units: number;
  vaccinations_amount: number;
  vaccinations_units: number;
  bednets_amount: number;
  bednets_units: number;
  malaria_medicine_amount: number;
  malaria_medicine_units: number;
  direct_transfer_amount: number;
  direct_transfer_units: number;
  deworming_amount: number;
  deworming_units: number;
  lives: number;
  expired_donation_id: string;
  expired_donation_at: Date;
  expired_membership_id: string;
  expired_membership_at: Date;
};
