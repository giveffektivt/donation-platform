import {
  createGavebrev,
  GavebrevStatus,
  listGavebrev,
  logError,
  logRequestError,
  stopGavebrev,
  updateGavebrevStatus,
} from "src";
import { z } from "zod";

const PayloadCreateSchema = z
  .object({
    name: z.string().min(1).max(500),
    tin: z
      .string()
      .regex(/^(\d{6}-?\d{4}|\d{8})$/)
      .transform((s) => s.replace(/^(\d{6})(\d{4})$/, "$1-$2")),
    email: z.email().max(500),
    startYear: z.coerce.number().min(new Date().getFullYear()),
    percentage: z.coerce.number().min(1).max(100).optional(),
    percentageAboveThreshold: z.coerce.number().min(1).max(100).optional(),
    amount: z.coerce.number().min(1).optional(),
    minimalIncome: z.coerce.number().min(0).optional(),
  })
  .refine((data) => data.amount || data.percentage, {
    path: ["amount"],
    error: "either percentage or amount must be provided",
  })
  .refine((data) => !data.amount || !data.percentage, {
    path: ["amount"],
    error: "choose either percentage or amount, not both",
  })
  .refine((data) => !data.percentageAboveThreshold || data.percentage, {
    path: ["percentageAboveThreshold"],
    error: "percentageAboveThreshold requires percentage",
  });

const PayloadStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(GavebrevStatus),
});

const PayloadStopSchema = z.object({
  id: z.string().min(1),
});

function authorize(req: Request): boolean {
  if (!process.env.GAVEBREV_API_KEY) {
    throw new Error("GAVEBREV_API_KEY is not defined");
  }

  return (
    req.headers.get("Authorization") ===
    `Bearer ${process.env.GAVEBREV_API_KEY}`
  );
}

export async function GET(req: Request) {
  try {
    if (!authorize(req)) {
      await logError("GET api/gavebrev: Unauthorized");
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    return Response.json({ message: "OK", data: await listGavebrev() });
  } catch (err) {
    await logError("api/gavebrev:", err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let payload: unknown;
  try {
    if (!authorize(req)) {
      await logError("POST api/gavebrev: Unauthorized");
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    payload = await req.json();
    const parsed = await PayloadCreateSchema.safeParseAsync(payload);
    if (!parsed.success) {
      await logRequestError("POST api/gavebrev:", parsed.error, payload);
      return Response.json(
        {
          message: "Validation failed",
          errors: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },

        { status: 400 },
      );
    }

    const agreementId = await createGavebrev(parsed.data);

    return Response.json({ message: "OK", agreementId });
  } catch (err) {
    await logRequestError("POST api/gavebrev:", err, payload);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  let payload: unknown;
  try {
    if (!authorize(req)) {
      await logError("PATCH api/gavebrev: Unauthorized");
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    payload = await req.json();
    const parsed = await PayloadStatusSchema.safeParseAsync(payload);
    if (!parsed.success) {
      await logRequestError("PATCH api/gavebrev:", parsed.error, payload);
      return Response.json(
        {
          message: "Validation failed",
          errors: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 },
      );
    }

    const found = await updateGavebrevStatus(
      parsed.data.id,
      parsed.data.status,
    );
    if (!found) {
      await logError(`PATCH api/gavebrev: agreement ${parsed.data.id} not found`);
      return Response.json({ message: "Not found" }, { status: 404 });
    }
    return Response.json({ message: "OK" });
  } catch (err) {
    await logRequestError("PATCH api/gavebrev:", err, payload);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  let payload: unknown;
  try {
    if (!authorize(req)) {
      await logError("DELETE api/gavebrev: Unauthorized");
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    payload = await req.json();
    const parsed = await PayloadStopSchema.safeParseAsync(payload);
    if (!parsed.success) {
      await logRequestError("DELETE api/gavebrev:", parsed.error, payload);
      return Response.json(
        {
          message: "Validation failed",
          errors: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },

        { status: 400 },
      );
    }

    const found = await stopGavebrev(parsed.data.id);
    if (!found) {
      await logError(`DELETE api/gavebrev: agreement ${parsed.data.id} not found`);
      return Response.json({ message: "Not found" }, { status: 404 });
    }
    return Response.json({ message: "OK" });
  } catch (err) {
    await logRequestError("DELETE api/gavebrev:", err, payload);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
}
