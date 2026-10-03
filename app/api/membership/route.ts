import { logRequestError, processQuickpayMembership } from "src";
import { z } from "zod";

const PayloadSchema = z
  .object({
    name: z.string().min(1).max(500),
    tin: z.string().min(1).max(500),
    email: z.email().max(500),
    address: z.string().min(1).max(500),
    postcode: z.string().min(1).max(500),
    city: z.string().min(1).max(500),
    country: z.string().min(1).max(500),
    birthday: z.preprocess(
      (val) => (!val ? undefined : val),
      z.coerce.date().optional(),
    ),
  })
  .refine(
    (data) => data.country !== "Denmark" || /^\d{6}-\d{4}$/.test(data.tin),
    {
      path: ["tin"],
      error: "tin doesn't look like CPR-nr.",
    },
  );

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
    const submitData = await PayloadSchema.parseAsync(payload);

    const [redirect] = await processQuickpayMembership(submitData);

    return Response.json({
      message: "OK",
      redirect,
    });
  } catch (err) {
    await logRequestError("api/membership:", err, payload);
    return Response.json({}, { status: 500 });
  }
}
