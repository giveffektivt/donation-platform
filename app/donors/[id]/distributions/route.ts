import {
  dbClient,
  buildNorwegianCauseAreaDistribution,
  dbRelease,
  getDonationDistributions,
  logError,
  verifyJwtBearerToken,
  getDonorIdsByEmail,
} from "src";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const user = await verifyJwtBearerToken(req.headers.get("authorization"));
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const kids = (params.get("kids") ?? "").split(",");

  let db = null;

  try {
    db = await dbClient();

    const donations = await getDonationDistributions(
      db,
      user[process.env.AUTH0_EMAIL_CLAIM] as string,
      kids,
    );

    const donorIds = (
      await getDonorIdsByEmail(
        db,
        user[process.env.AUTH0_EMAIL_CLAIM] as string,
      )
    ).map((p) => p.id);

    return Response.json({
      status: 200,
      content: donations.map((d) => {
        const earmarks = d.earmarks as {
          recipient: string;
          amount: number;
        }[];
        const causeAreas = buildNorwegianCauseAreaDistribution(
          earmarks,
          d.amount,
        );

        return {
          id: d.id,
          kid: d.id,
          donorId: 0,
          taxUnitId: donorIds.indexOf(d.donor_id) + 1,
          causeAreas,
        };
      }),
    });
  } catch (e) {
    logError("donors/[id]/distributions: ", e);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
