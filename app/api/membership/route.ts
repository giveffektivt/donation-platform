import {
  logError,
  processQuickpayMembership,
  type SubmitDataMembership,
  validationSchemaMembership,
} from "src";
import * as yup from "yup";

export async function POST(req: Request) {
  try {
    const submitData: SubmitDataMembership = await yup
      .object()
      .shape(validationSchemaMembership)
      .validate(await req.json());

    const [redirect] = await processQuickpayMembership(submitData);

    return Response.json({
      message: "OK",
      redirect,
    });
  } catch (err) {
    logError("api/membership:", err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
}
