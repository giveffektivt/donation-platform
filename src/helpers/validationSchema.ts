import * as yup from "yup";

export const validationSchema = {
  amount: yup
    .number()
    .required("Skriv hvor meget du vil donere")
    .min(1, "Mindst 1 kr.")
    .integer("Skriv et heltal")
    .typeError("Skriv et heltal"),
  recipient: yup.string().required("Vælg en modtager"),
  subscription: yup
    .string()
    .required("Hvor ofte vil du donere?")
    .when("method", {
      is: "mobilePay",
      then: (schema) => schema.oneOf(["oneTime"]),
      otherwise: (schema) => schema.oneOf(["oneTime", "everyMonth"]),
    }),
  name: yup
    .string()
    .when("membership", {
      is: true,
      then: (schema) => schema.required("Skriv dit navn"),
      otherwise: (schema) => schema,
    })
    .max(320, "Højst 320 tegn")
    .transform((value) => (!value ? undefined : value)),
  email: yup
    .string()
    .required("Skriv din email-adresse")
    .max(320, "Højst 320 tegn")
    .matches(/@/, "Email-adressen er ikke gyldig"),
  method: yup
    .string()
    .when("membership", {
      is: true,
      then: (schema) =>
        schema.when("membershipOnly", {
          is: true,
          then: (schema) => schema.oneOf(["creditCard"]),
          otherwise: (schema) => schema.oneOf(["creditCard", "bankTransfer"]),
        }),
      otherwise: (schema) =>
        schema.oneOf(["creditCard", "mobilePay", "bankTransfer"]),
    })
    .required("Vælg en betalingsmetode"),
  tin: yup
    .string()
    .when("membership", {
      is: true,
      then: (schema) => schema.required("CPR-nr. kræves for medlemskab."),

      otherwise: (schema) => schema,
    })
    .when("taxDeduction", {
      is: true,
      then: (schema) =>
        schema.required("CPR-nr. kræves for at få skattefradrag."),

      otherwise: (schema) => schema,
    })
    .matches(/^(\d{6}-\d{4})?$/, "Angiv CPR-nr. som DDMMÅÅ-XXXX")
    .transform((value) => (!value ? undefined : value)),
  membership: yup
    .boolean()
    .required()
    .when("membershipOnly", {
      is: true,
      then: (schema) => schema.oneOf([true]),
      otherwise: (schema) => schema,
    }),
  membershipOnly: yup.boolean().required(),
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
          .required("Postnummer skal udfyldes")
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
  taxDeduction: yup.bool().required().oneOf([true, false]),
};

export const validationSchemaEn = {
  name: yup.string().required("Write your name"),
  email: yup
    .string()
    .required("Write your email address")
    .matches(/@/, "Email address is invalid"),
  tin: yup.string().required("TIN is required"),
  address: yup.string().required("Address is required"),
  zip: yup.string().required("Postcode is required"),
  city: yup.string().required("City is required"),
  birthday: yup
    .date()
    .required("Birthday is required")
    .typeError("Birthday is required"),
  country: yup.string().required("Country is required"),
};

const enSchemaObj = yup.object(validationSchemaEn);
export type EnSubmitData = yup.InferType<typeof enSchemaObj>;
