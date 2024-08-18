import {
  DonationFrequency,
  DonationRecipient,
  PaymentMethod,
} from "src/donation/types";
import * as yup from "yup";

export const validationSchemaDonation = {
  amount: yup
    .number()
    .required("Vælg hvor meget du vil donere")
    .min(1, "Mindst 1 kr.")
    .integer("Skriv et heltal")
    .typeError("Skriv et heltal"),
  recipient: yup
    .string()
    .trim()
    .required("Vælg en modtager")
    .oneOf([
      DonationRecipient.GivEffektivtsAnbefaling,
      DonationRecipient.MedicinModMalaria,
      DonationRecipient.MyggenetModMalaria,
      DonationRecipient.StorOgVelkendtEffekt,
      DonationRecipient.VaccinerTilSpædbørn,
      DonationRecipient.VitaminModMangelsygdomme,
    ]),
  frequency: yup
    .string()
    .trim()
    .required("Vælg hvor ofte du vil donere")
    .oneOf([
      DonationFrequency.Once,
      DonationFrequency.Monthly,
      DonationFrequency.Match,
    ]),
  taxDeductible: yup.bool().required(),
  tin: yup
    .string()
    .trim()
    .when("taxDeductible", {
      is: true,
      then: (schema) =>
        schema.required("Oplysninger kræves for at få skattefradrag"),

      otherwise: (schema) => schema,
    })
    .matches(
      /^(\d{6}-\d{4}|\d{8})?$/,
      "Angiv CPR-nr. som DDMMÅÅ-XXXX eller CVR-nr. som XXXXXXXX",
    )
    .transform((value) => (!value ? undefined : value)),
  email: yup
    .string()
    .trim()
    .lowercase()
    .required("Email skal udfyldes")
    .max(320, "Højst 320 tegn")
    .matches(/@/, "Email er ikke gyldig"),
  method: yup
    .string()
    .trim()
    .oneOf([
      PaymentMethod.CreditCard,
      PaymentMethod.MobilePay,
      PaymentMethod.BankTransfer,
    ])
    .required("Vælg en betalingsmetode"),
  rulesAccepted: yup
    .bool()
    .oneOf([true], "Handelsbetingelserne skal accepteres"),
  subscribeToNewsletter: yup.bool().required(),
};
