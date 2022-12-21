import {
  DonationFrequency,
  DonationRecipient,
  PaymentMethod,
} from "src/donation/types";

export const parsePaymentMethod = (method: string) => {
  const parsed = method as PaymentMethod;
  if (Object.values(PaymentMethod).includes(parsed)) {
    return parsed;
  }
  throw new Error(`api/donation: Unrecognized payment method "${method}"`);
};

export const parseDonationFrequency = (frequency: string) => {
  const parsed = frequency as DonationFrequency;
  if (Object.values(DonationFrequency).includes(parsed)) {
    return parsed;
  }
  throw new Error(`Unrecognized donation frequency: ${frequency}`);
};

export const parseDonationRecipient = (recipient: string) => {
  const parsed = recipient as DonationRecipient;
  if (Object.values(DonationRecipient).includes(parsed)) {
    return parsed;
  }
  throw new Error(`Unrecognized donation recipient: ${recipient}`);
};
