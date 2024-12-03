import * as yup from "yup";

export const validationSchemaNewFundraiser = {
  title: yup
    .string()
    .trim()
    .required("Titlen skal udfyldes")
    .max(320, "Højst 320 tegn"),
  email: yup
    .string()
    .trim()
    .lowercase()
    .required("Email skal udfyldes")
    .max(320, "Højst 320 tegn")
    .matches(/@/, "Email er ikke gyldig"),
  has_activity_match: yup.bool().required(),
  activity_match_currency: yup
    .string()
    .trim()
    .when("has_activity_match", {
      is: true,
      then: (schema) =>
        schema.required("Skriv match aktivitet, f.eks.: kr. pr. km."),
      otherwise: (schema) => schema,
    })
    .transform((value) => (!value ? undefined : value)),
};
