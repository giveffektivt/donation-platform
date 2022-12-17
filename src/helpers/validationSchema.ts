import * as yup from "yup";

export const validationSchema = {
  amount: yup
    .number()
    .required("Vælg hvor meget du vil donere")
    .min(1, "Mindst 1 kr.")
    .integer("Skriv et heltal")
    .typeError("Skriv et heltal"),
  recipient: yup.string().required("Vælg en modtager"),
  subscription: yup
    .string()
    .required("Vælg hvor ofte du vil donere")
    .oneOf(["oneTime", "everyMonth"]),
  name: yup
    .string()
    .when("membership", {
      is: true,
      then: (schema) => schema.required("Fuldt navn skal udfyldes"),
      otherwise: (schema) => schema,
    })
    .max(320, "Højst 320 tegn")
    .transform((value) => (!value ? undefined : value)),
  email: yup
    .string()
    .required("Email skal udfyldes")
    .max(320, "Højst 320 tegn")
    .matches(/@/, "Email er ikke gyldig"),
  method: yup
    .string()
    .when("membership", {
      is: true,
      then: (schema) => schema.oneOf(["creditCard"]),
      otherwise: (schema) =>
        schema.oneOf(["creditCard", "mobilePay", "bankTransfer"]),
    })
    .required("Vælg en betalingsmetode"),
  tin: yup
    .string()
    .when("taxDeduction", {
      is: true,
      then: (schema) =>
        schema.required("Oplysninger kræves for at få skattefradrag"),

      otherwise: (schema) => schema,
    })
    .matches(
      /^(\d{6}-\d{4}|\d{8})?$/,
      "Angiv CPR-nr. som DDMMÅÅ-XXXX eller CVR-nr. som XXXXXXXX"
    )
    .transform((value) => (!value ? undefined : value)),
  cpr: yup
    .string()
    .when("membership", {
      is: true,
      then: (schema) => schema.required("CPR-nr. skal udfyldes"),
      otherwise: (schema) => schema,
    })
    .matches(/^(\d{6}-\d{4})?$/, "Angiv CPR-nr. som DDMMÅÅ-XXXX")
    .transform((value) => (!value ? undefined : value)),
  membership: yup.boolean().required(),
  address: yup
    .string()
    .when("membership", {
      is: true,
      then: (schema) => schema.required("Adresse skal udfyldes"),
      otherwise: (schema) => schema,
    })
    .max(320, "Højst 320 tegn")
    .transform((value) => (!value ? undefined : value)),
  zip: yup
    .string()
    .when("membership", {
      is: true,
      then: (schema) =>
        schema
          .required("Postnr. skal udfyldes")
          .test("type", "Skriv et tal", (val: string | undefined) => {
            return val ? /^[0-9]*$/.test(val) : false;
          })
          .test(
            "len",
            "Skriv 3 eller 4 tal",
            (val: string | undefined) => val?.length === 3 || val?.length === 4
          ),
      otherwise: (schema) => schema,
    })
    .transform((value) => (!value ? undefined : value)),
  city: yup
    .string()
    .when("membership", {
      is: true,
      then: (schema) => schema.required("By skal udfyldes"),
      otherwise: (schema) => schema,
    })
    .max(320, "Højst 320 tegn")
    .transform((value) => (!value ? undefined : value)),
  rulesAccepted: yup
    .bool()
    .oneOf([true], "Handelsbetingelserne skal accepteres"),
  taxDeduction: yup.bool().required(),
  subscribeToNewsletter: yup.bool().required(),
};
