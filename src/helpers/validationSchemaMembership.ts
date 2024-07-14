import * as yup from "yup";

export const validationSchemaMembership = {
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
  address: yup
    .string()
    .trim()
    .required("Adresse skal udfyldes")
    .max(320, "Højst 320 tegn"),
  postcode: yup
    .string()
    .trim()
    .required("Postnr. skal udfyldes")
    .max(320, "Højst 320 tegn"),
  city: yup
    .string()
    .trim()
    .required("By skal udfyldes")
    .max(320, "Højst 320 tegn"),
};
