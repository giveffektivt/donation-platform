import {
  dbClient,
  dbRelease,
  getDonorsDetailedByEmail,
  insertDonorTaxUnit,
  logError,
  toTaxUnit,
  verifyJwtBearerToken,
} from "src";
import { z } from "zod";

const TaxUnitPayloadSchema = z.object({
  name: z.preprocess(
    (val) => (!val ? undefined : val),
    z.string().max(500).optional(),
  ),
  ssn: z.preprocess(
    (val) => (!val ? undefined : val),
    z
      .string()
      .regex(/^(\d{6}-?\d{4}|\d{8})$/)
      .transform((s) => s.replace(/^(\d{6})(\d{4})$/, "$1-$2"))
      .optional(),
  ),
});

export async function GET(req: Request) {
  const user = await verifyJwtBearerToken(req.headers.get("authorization"));
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let db = null;

  try {
    db = await dbClient();

    const donors = await getDonorsDetailedByEmail(
      db,
      user[process.env.AUTH0_EMAIL_CLAIM] as string,
    );

    return Response.json({
      status: 200,
      content: donors.map(toTaxUnit),
    });
  } catch (e) {
    logError("donors/[id]/taxunits: ", e);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}

export async function POST(req: Request) {
  const user = await verifyJwtBearerToken(req.headers.get("authorization"));
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const parsed = TaxUnitPayloadSchema.safeParse(await req.json());
  if (!parsed.success) {
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

  let db = null;

  try {
    db = await dbClient();

    const email = user[process.env.AUTH0_EMAIL_CLAIM] as string;
    const { id: newDonorId } = await insertDonorTaxUnit(
      db,
      email,
      parsed.data.name,
      parsed.data.ssn,
    );

    const donors = await getDonorsDetailedByEmail(db, email);
    const idx = donors.findIndex((d) => d.donor_id === newDonorId);
    if (idx === -1) {
      throw new Error(`Newly created donor ${newDonorId} not found`);
    }

    return Response.json({
      status: 200,
      content: toTaxUnit(donors[idx], idx),
    });
  } catch (e) {
    logError("POST donors/[id]/taxunits: ", e);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
