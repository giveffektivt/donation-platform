import { dbClient, dbRelease, insertFundraiser, logError } from "src";
import { z } from "zod";

const PayloadSchema = z
  .object({
    title: z.string().min(1).max(500),
    email: z.email().max(500),
    hasActivityMatch: z.boolean().default(false),
    activityMatchCurrency: z.string().min(1).optional(),
  })
  .refine((data) => !data.hasActivityMatch || !!data.activityMatchCurrency, {
    path: ["activityMatchCurrency"],
    error: "activityMatchCurrency is required",
  });

export async function POST(req: Request) {
  let db = null;
  try {
    if (!process.env.FUNDRAISER_API_KEY) {
      throw new Error("FUNDRAISER_API_KEY is not defined");
    }

    if (
      req.headers.get("Authorization") !==
      `Bearer ${process.env.FUNDRAISER_API_KEY}`
    ) {
      logError("POST api/fundraiser: Unauthorized");
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const parsed = await PayloadSchema.safeParseAsync(await req.json());
    if (!parsed.success) {
      logError(
        "POST api/fundraiser: Validation failed for request body: ",
        parsed.error,
      );
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

    db = await dbClient();
    const fundraiser = await insertFundraiser(db, {
      email: parsed.data.email,
      title: parsed.data.title,
      has_match: parsed.data.hasActivityMatch,
      match_currency: parsed.data.activityMatchCurrency,
    });

    return Response.json({
      message: "OK",
      id: fundraiser.id,
      admin: `${process.env.HOMEPAGE_URL}/indsamling-admin/?id=${fundraiser.id}#key=${fundraiser.key}`,
    });
  } catch (err) {
    logError("api/fundraiser:", err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
