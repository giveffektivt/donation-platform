import {
  DonationFrequency,
  DonationRecipient,
  PaymentMethod,
} from "src/donation/types";

export const parsePaymentMethod = (method: string) => {
  switch (method) {
    case "mobilePay":
      return PaymentMethod.MobilePay;
    case "creditCard":
      return PaymentMethod.CreditCard;
    case "bankTransfer":
      return PaymentMethod.BankTransfer;
    default:
      throw new Error(`api/payment: Unrecognized payment method "${method}"`);
  }
};

export const parseDonationFrequency = (frequency: string) => {
  switch (frequency) {
    case "everyMonth":
      return DonationFrequency.Monthly;
    case "oneTime":
      return DonationFrequency.Once;
    default:
      throw new Error(`Unrecognized donation frequency: ${frequency}`);
  }
};

export const parseDonationRecipient = (recipient: string) => {
  const parsed = recipient as DonationRecipient;
  if (Object.values(DonationRecipient).includes(parsed)) {
    return parsed;
  }
  throw new Error(`Unrecognized donation recipient: ${recipient}`);
};
