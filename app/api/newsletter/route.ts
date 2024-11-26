import {
  logError,
  type SubmitDataNewsletter,
  SubscribeToNewsletter,
  validationSchemaNewsletter,
} from "src";
import * as yup from "yup";

export async function POST(req: Request) {
  try {
    const submitData: SubmitDataNewsletter = await yup
      .object()
      .shape(validationSchemaNewsletter)
      .validate(await req.json());

    try {
      await SubscribeToNewsletter(submitData.email, submitData.email);
    } catch (err) {
      logError("api/newsletter: Error subscribing to newsletter: ", err);
    }

    return Response.json({ message: "OK" });
  } catch (err) {
    logError("api/newsletter:", err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
}
