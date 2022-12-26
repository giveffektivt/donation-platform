import {
  DonationFrequency,
  DonationRecipient,
  PaymentMethod,
} from "src/donation/types";

export const parsePaymentMethod = (value: string) => {
  const parsed = value as PaymentMethod;
  if (Object.values(PaymentMethod).includes(parsed)) {
    return parsed;
  }
  throw new Error(`api/donation: Unrecognized payment method "${value}"`);
};

export const parseDonationFrequency = (value: string) => {
  const parsed = value as DonationFrequency;
  if (Object.values(DonationFrequency).includes(parsed)) {
    return parsed;
  }
  throw new Error(`Unrecognized donation frequency: ${value}`);
};

export const parseDonationRecipient = (value: string) => {
  const parsed = value as DonationRecipient;
  if (Object.values(DonationRecipient).includes(parsed)) {
    return parsed;
  }
  throw new Error(`Unrecognized donation recipient: ${value}`);
};
