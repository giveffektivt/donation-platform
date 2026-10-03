import { getRenewPaymentLink, logError, logRequestError } from "src";
import { z } from "zod";

const PayloadSchema = z.object({
  id: z.uuid(),
});

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
    const submitData = await PayloadSchema.parseAsync(payload);

    const url = await getRenewPaymentLink(submitData.id);

    if (url == null) {
      await logError(
        `api/renew-payment: attempted to renew payment on donation '${submitData.id}' that doesn't allow it`,
      );
      return Response.json({ message: "Not found" }, { status: 404 });
    }

    return Response.json({ message: "OK", url });
  } catch (err) {
    await logRequestError("api/renew-payment:", err, payload);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
}
