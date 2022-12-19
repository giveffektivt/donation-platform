import * as yup from "yup";

export const validationSchemaMembership = {
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
  address: yup
    .string()
    .required("Adresse skal udfyldes")
    .max(320, "Højst 320 tegn"),
  zip: yup
    .string()
    .required("Postnr. skal udfyldes")
    .test("type", "Skriv et tal", (val: string | undefined) => {
      return val ? /^[0-9]*$/.test(val) : false;
    })
    .test(
      "len",
      "Skriv 3 eller 4 tal",
      (val: string | undefined) => val?.length === 3 || val?.length === 4
    ),
  city: yup.string().required("By skal udfyldes").max(320, "Højst 320 tegn"),
};
