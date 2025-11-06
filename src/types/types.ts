import type { DonationFrequency, DonationRecipient, PaymentMethod } from "src";

export type NewDonation = {
  amount: number;
  frequency: DonationFrequency;
  taxDeductible: boolean;
  tin?: string;
  email: string;
  method: PaymentMethod;
  earmarks: {
    recipient: DonationRecipient;
    percentage: number;
  }[];
  fundraiserId?: string;
  publicMessageAuthor?: boolean;
  messageAuthor?: string;
  message?: string;
};

export type NewMembership = {
  name: string;
  tin: string;
  email: string;
  address: string;
  postcode: string;
  city: string;
  country: string;
  birthday?: Date;
};

export type NewGavebrev = {
  name: string;
  tin: string;
  email: string;
  startYear: number;
  amount?: number;
  percentage?: number;
  minimalIncome?: number;
};
