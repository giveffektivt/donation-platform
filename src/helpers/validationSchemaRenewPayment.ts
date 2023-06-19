import * as yup from "yup";

const isUUIDv4 =
  /^([0-9a-fA-F]{8})-([0-9a-fA-F]{4})-([1-5][0-9a-fA-F]{3})-([89abAB][0-9a-fA-F]{3})-([0-9a-fA-F]{12})$/;

export const validationSchemaRenewPayment = {
  id: yup
    .string()
    .trim()
    .required("ID skal udfyldes")
    .test("is-uuid", "ID skal være UUID", (value) =>
      isUUIDv4.test(value as string)
    ),
};
