export enum DonationRecipient {
  Medlemskab = "medlemskab",
  StorVelkendtEffekt = "stor-velkendt-effekt",
  SmartFordeling = "smart-fordeling",
  Drift = "drift",
  SmartFordelingGlobal = "smart-fordeling-global",
  SmartFordelingDyr = "smart-fordeling-dyr",
  Dyrevelfærd = "dyrevelfærd",
  Fødevareomstilling = "fødevareomstilling",
  Andet = "andet",
  Myggenet = "myggenet",
  Kontantoverførsler = "kontantoverførsler",
  Malariamedicin = "malariamedicin",
  AVitamin = "a-vitamin",
  Ormekur = "ormekur",
  Spædbørnsvacciner = "spædbørnsvacciner",
}

export enum DonationFrequency {
  Once = "once",
  Monthly = "monthly",
  Yearly = "yearly",
  Match = "match",
}

export enum PaymentGateway {
  Quickpay = "Quickpay",
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
  referral_code: string | null;
  created_at: Date;
  updated_at: Date;
};

export type DonationWithGatewayInfoQuickpay = Donation & {
  gateway_metadata: DonationGatewayMetadataQuickpay;
};

export type DonationWithGatewayInfoBankTransfer = Donation & {
  gateway_metadata: DonationGatewayMetadataBankTransfer;
};

export type DonationGatewayMetadataQuickpay = {
  quickpay_id: string;
  quickpay_order: string;
  quickpay_legacy?: boolean;
};

export type DonationGatewayMetadataBankTransfer = {
  bank_msg: string;
};

export type DonationToEmail = {
  id: string;
  email: string;
  amount: number;
  earmarks: { recipient: DonationRecipient; amount: number }[];
  frequency: DonationFrequency;
  tax_deductible: boolean;
  suggest_membership: boolean;
  referral_code: string | null;
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
  id: string;
  name: string;
  tin: string | null;
  created_at: Date;
};

export type DonationImpact = {
  recipient: string;
  unit: string;
  amount: number;
  count: number;
};

export type ChargedDonation = {
  donor_id: string;
  name: string;
  email: string;
  tin: string;
  donation_id: string;
  frequency: DonationFrequency;
  amount: number;
  earmarks: string;
  cancelled: boolean;
  method: PaymentMethod;
  gateway: PaymentGateway;
  tax_deductible: boolean;
  charge_id: string;
  charge_short_id: string;
  charged_at: Date;
  donation_created_at: Date;
  impact: DonationImpact[];
};
