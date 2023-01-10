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
    .test("type", "Skriv et tal", (val: string | undefined) => {
      return val ? /^[0-9]*$/.test(val) : false;
    })
    .test(
      "len",
      "Skriv 3 eller 4 tal",
      (val: string | undefined) => val?.length === 3 || val?.length === 4
    ),
  city: yup
    .string()
    .trim()
    .required("By skal udfyldes")
    .max(320, "Højst 320 tegn"),
};
