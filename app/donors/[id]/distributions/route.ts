import {
  dbClient,
  mapToNorwegianOrgId,
  dbRelease,
  getDonationDistributions,
  logError,
  verifyJwtBearerToken,
  DonationRecipient,
  getDonorIdsByEmail,
  norwegianCauseAreas,
  norwegianOrgs,
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
        const causeAreas = norwegianCauseAreas
          .map((causeArea) => {
            const causeAreaEarmarks = earmarks.filter((earmark) => {
              const orgId = mapToNorwegianOrgId(earmark.recipient);
              return (
                norwegianOrgs.find((org) => org.id === orgId)?.causeAreaId ===
                causeArea.id
              );
            });
            const amount = causeAreaEarmarks.reduce(
              (sum, earmark) => sum + earmark.amount,
              0,
            );
            const smartRecipient =
              causeArea.id === 99
                ? DonationRecipient.SmartFordeling
                : causeArea.id === 1
                  ? DonationRecipient.SmartFordelingGlobalSundhed
                  : causeArea.id === 2
                    ? DonationRecipient.SmartFordelingDyrevelfærd
                    : null;
            const standardSplit =
              smartRecipient !== null &&
              causeAreaEarmarks.length === 1 &&
              causeAreaEarmarks[0].recipient === smartRecipient;

            return {
              id: causeArea.id,
              name: causeArea.name,
              standardSplit,
              amount,
              percentageShare: (amount / d.amount) * 100,
              organizations: causeAreaEarmarks.map((earmark) => ({
                id: mapToNorwegianOrgId(earmark.recipient),
                name: earmark.recipient,
                amount: earmark.amount,
                percentageShare: (earmark.amount / amount) * 100,
              })),
            };
          })
          .filter((causeArea) => causeArea.amount > 0);

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
