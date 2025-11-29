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
  RenewNo = "renew-no",
  RenewAttempted = "renew-attempted",
}

export type Donation = {
  id: string;
  donor_id: string;
  emailed: EmailedStatus;
  amount: number;
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
  quickpay_legacy?: boolean;
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
  recipient?: DonationRecipient;
  frequency: DonationFrequency;
  tax_deductible: boolean;
};

export type FailedRecurringDonation = {
  failed_at: Date;
  amount: number;
  method: PaymentMethod;
  donor_id: string;
  donor_name: string;
  donor_email: string;
  donation_id: string;
  recipient: DonationRecipient;
  frequency: DonationFrequency;
  tax_deductible: boolean;
  fundraiser_id?: string;
  message?: string;
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

export type Donor = {
  name: string;
  created_at: Date;
};
