import {
  changeDonorTaxUnit,
  dbExecuteInTransaction,
  getDonorIdsByEmail,
  getDonorsDetailedByEmail,
  logError,
  toTaxUnit,
  verifyJwtBearerToken,
} from "src";
import { z } from "zod";

const TaxUnitPayloadSchema = z.object({
  taxUnit: z.object({
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
  }),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; taxUnitId: string }> },
) {
  const user = await verifyJwtBearerToken(req.headers.get("authorization"));
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { taxUnitId } = await params;
  const idx = Number.parseInt(taxUnitId, 10) - 1;
  if (!Number.isInteger(idx) || idx < 0) {
    return Response.json({ message: "Invalid tax unit id" }, { status: 400 });
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

  try {
    const email = user[process.env.AUTH0_EMAIL_CLAIM] as string;

    const taxUnit = await dbExecuteInTransaction(async (db) => {
      const donorIds = await getDonorIdsByEmail(db, email);

      if (idx >= donorIds.length) {
        return Response.json({ message: "Not found" }, { status: 404 });
      }

      const donorId = donorIds[idx].id;

      const changed = await changeDonorTaxUnit(
        db,
        donorId,
        parsed.data.taxUnit.name,
        parsed.data.taxUnit.ssn,
      );

      if (!changed) {
        return Response.json({ message: "Not found" }, { status: 404 });
      }

      const refreshed = await getDonorsDetailedByEmail(db, email);
      const newIdx = refreshed.findIndex((d) => d.donor_id === changed.id);
      if (newIdx === -1) {
        throw new Error(`Updated donor ${changed.id} not found`);
      }

      return toTaxUnit(refreshed[newIdx], newIdx);
    });

    return Response.json({
      status: 200,
      content: taxUnit,
    });
  } catch (e: any) {
    logError("PUT donors/[id]/taxunits/[taxUnitId]: ", e);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
}
