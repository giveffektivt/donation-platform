import {
  dbClient,
  mapToNorwegianOrgId,
  dbRelease,
  getDonationDistributions,
  logError,
  verifyJwtBearerToken,
  DonationRecipient,
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
      content: donations.map((d) => ({
        id: d.id,
        kid: d.id,
        donorId: 0,
        taxUnitId: donorIds.indexOf(d.donor_id) + 1,
        causeAreas: [
          {
            id: 1,
            name: "Global health",
            standardSplit:
              d.earmarks.length === 1 &&
              d.earmarks[0].recipient ===
                DonationRecipient.GivEffektivtsAnbefaling,
            percentageShare: 100,
            organizations: d.earmarks.map((e: any) => ({
              id: mapToNorwegianOrgId(e.recipient),
              name: e.recipient,
              percentageShare: e.percentage,
            })),
          },
        ],
      })),
    });
  } catch (e) {
    logError("donors/[id]/recurring/vipps: ", e);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
