export enum DonationRecipient {
  GivEffektivtMembership = "Giv Effektivt membership",
  GiveWellMaximumImpactFund = "GiveWell Maximum Impact Fund",
  AgainstMalariaFoundation = "Against Malaria Foundation",
  MalariaConsortium = "Malaria Consortium",
  HelenKellerInternational = "Helen Keller International",
  NewIncentives = "New Incentives",
}

export enum DonationFrequency {
  Once = "once",
  Monthly = "monthly",
  Yearly = "yearly",
}

export enum PaymentGateway {
  ScanPay = "ScanPay",
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

export type DonationWithGatewayInfoScanPay = Donation & {
  gateway_metadata: DonationGatewayMetadataScanPay;
};

export type DonationWithGatewayInfoBankTransfer = Donation & {
  gateway_metadata: DonationGatewayMetadataBankTransfer;
};

export type DonationGatewayMetadataScanPay = {
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
