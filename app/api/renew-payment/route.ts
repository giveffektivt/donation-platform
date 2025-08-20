import { getRenewPaymentLink, logError } from "src";
import { z } from "zod";

const PayloadSchema = z.object({
  id: z.uuid(),
});

export async function POST(req: Request) {
  try {
    const submitData = await PayloadSchema.parseAsync(await req.json());

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
