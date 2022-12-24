import moment from "moment";
import { GavebrevType } from "src/gavebrev/types";
import * as yup from "yup";

export const validationSchemaGavebrev = {
  name: yup
    .string()
    .required("Fuldt navn skal udfyldes")
    .max(320, "Højst 320 tegn"),
  tin: yup
    .string()
    .required("CPR-nr. skal udfyldes")
    .matches(/^(\d{6}-\d{4})?$/, "Angiv CPR-nr. som DDMMÅÅ-XXXX"),
  email: yup
    .string()
    .required("Email skal udfyldes")
    .max(320, "Højst 320 tegn")
    .matches(/@/, "Email er ikke gyldig"),
  startYear: yup
    .number()
    .required("Start år skal udfyldes")
    .min(moment().year(), "Start år kan ikke være i fortiden")
    .integer("Skriv et heltal")
    .typeError("Skriv et heltal"),
  type: yup
    .string()
    .required("Gavebrev type skal udfyldes")
    .oneOf([GavebrevType.Percentage, GavebrevType.Amount]),
  amount: yup
    .number()
    .required("Gavebrev størrelse skal udfyldes")
    .min(1, "Mindst 1 kr. eller 1%")
    .integer("Skriv et heltal")
    .typeError("Skriv et heltal"),
  minimalIncome: yup.number().min(0),
};
