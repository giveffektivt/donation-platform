export enum DonationRecipient {
  GivEffektivt = "Giv Effektivt",

  GivEffektivtsAnbefaling = "Giv Effektivts anbefaling",
  StorOgVelkendtEffekt = "Stor og velkendt effekt",
  MyggenetModMalaria = "Myggenet mod malaria",
  MedicinModMalaria = "Medicin mod malaria",
  VitaminModMangelsygdomme = "Vitamin mod mangelsygdomme",
  VaccinerTilSpædbørn = "Vacciner til spædbørn",
}

export enum DonationFrequency {
  Once = "once",
  Monthly = "monthly",
  Yearly = "yearly",
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
};

export type FailedRecurringDonationToEmail = {
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
