import {
  getRenewPaymentLink,
  logError,
  type SubmitDataRenewPayment,
  validationSchemaRenewPayment,
} from "src";
import * as yup from "yup";

export async function POST(req: Request) {
  try {
    let submitData: SubmitDataRenewPayment | null = null;
    try {
      submitData = await yup
        .object()
        .shape(validationSchemaRenewPayment)
        .validate(await req.json());
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        logError(
          "api/renew-payment: Validation failed for request body: ",
          err,
        );
        return Response.json(
          { message: "Validation failed", errors: err.errors },
          { status: 400 },
        );
      }
      throw err;
    }

    const url = await getRenewPaymentLink(submitData.id);

    if (url == null) {
      logError(
        `api/renew-payment: attempted to renew payment on donation '${submitData.id}' that doesn't allow it`,
      );
      return Response.json({ message: "Not found" }, { status: 404 });
    }

    return Response.json({ message: "OK", url });
  } catch (err) {
    logError("api/renew-payment:", err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
}
