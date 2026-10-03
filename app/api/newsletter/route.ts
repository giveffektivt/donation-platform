import { logError, logRequestError, SubscribeToNewsletter } from "src";
import { z } from "zod";

const PayloadSchema = z.object({
  email: z.email().max(500),
});

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
    const submitData = await PayloadSchema.parseAsync(payload);

    try {
      await SubscribeToNewsletter(submitData.email);
    } catch (err) {
      await logError(
        `api/newsletter: Error subscribing ${submitData.email} to newsletter`,
        err,
      );
    }

    return Response.json({ message: "OK" });
  } catch (err) {
    await logRequestError("api/newsletter:", err, payload);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
}
