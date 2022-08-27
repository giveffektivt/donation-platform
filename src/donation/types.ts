export enum DonationRecipient {
  GivEffektivt = "Giv Effektivt",

  GivEffektivtsAnbefaling = "Giv Effektivts anbefaling",
  StørreMenVariabelEffekt = "Større, men variabel effekt",
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
  country: string;
};

export type BankTransferInfo = {
  amount: number;
  msg: string;
};
