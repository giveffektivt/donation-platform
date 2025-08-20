import { logError, SubscribeToNewsletter } from "src";
import { z } from "zod";

const PayloadSchema = z.object({
  email: z.email().max(500),
});

export async function POST(req: Request) {
  try {
    const submitData = await PayloadSchema.parseAsync(await req.json());

    try {
      await SubscribeToNewsletter(submitData.email);
    } catch (err) {
      logError(
        `api/newsletter: Error subscribing ${submitData.email} to newsletter`,
        err,
      );
    }

    return Response.json({ message: "OK" });
  } catch (err) {
    logError("api/newsletter:", err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
}
