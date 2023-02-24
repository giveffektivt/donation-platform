import moment from "moment";
import { GavebrevStatus } from "src/gavebrev/types";
import * as yup from "yup";

export const validationSchemaGavebrev = {
  name: yup
    .string()
    .trim()
    .required("Fuldt navn skal udfyldes")
    .max(320, "Højst 320 tegn"),
  tin: yup
    .string()
    .trim()
    .required("CPR-nr. skal udfyldes")
    .matches(/^(\d{6}-\d{4})?$/, "Angiv CPR-nr. som DDMMÅÅ-XXXX"),
  email: yup
    .string()
    .trim()
    .lowercase()
    .required("Email skal udfyldes")
    .max(320, "Højst 320 tegn")
    .matches(/@/, "Email er ikke gyldig"),
  startYear: yup
    .number()
    .required("Start år skal udfyldes")
    .min(moment().year(), "Start år kan ikke være i fortiden")
    .integer("Skriv et heltal")
    .typeError("Skriv et heltal"),
  percentage: yup.number().min(1, "Mindst 1%").max(100, "Mest 100%"),
  amount: yup
    .number()
    .min(1, "Mindst 1 kr.")
    .integer("Skriv et heltal")
    .typeError("Skriv et heltal"),
  eitherPercentageOrAmount: yup.bool().when(["percentage", "amount"], {
    is: (percentage: number, amount: number) => !percentage && !amount,
    then: (schema) =>
      schema.required("Enten `percentage` eller `amount` skal udfyldes"),
    otherwise: (schema) => schema,
  }),
  onlyPercentageOrAmount: yup.bool().when(["percentage", "amount"], {
    is: (percentage: number, amount: number) => percentage && amount,
    then: (schema) =>
      schema.required("Kun `percentage` eller `amount` skal udfyldes"),
    otherwise: (schema) => schema,
  }),
  minimalIncome: yup.number().min(0),
};

export const validationSchemaGavebrevStatus = {
  id: yup.string().trim().required("ID skal udfyldes"),
  status: yup
    .string()
    .trim()
    .required("Status skal udfyldes")
    .oneOf([
      GavebrevStatus.Created,
      GavebrevStatus.Active,
      GavebrevStatus.Rejected,
      GavebrevStatus.Cancelled,
      GavebrevStatus.Error,
    ]),
};
