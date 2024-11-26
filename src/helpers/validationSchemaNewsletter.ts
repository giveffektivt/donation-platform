import * as yup from "yup";

export const validationSchemaNewsletter = {
  email: yup
    .string()
    .trim()
    .lowercase()
    .required("Email skal udfyldes")
    .max(320, "Højst 320 tegn")
    .matches(/@/, "Email er ikke gyldig"),
};
