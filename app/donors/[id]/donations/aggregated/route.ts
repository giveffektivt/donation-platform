import {
  dbClient,
  dbRelease,
  getAggregatedDonationsByEmail,
  logError,
  mapToNorwegianOrgId,
  verifyJwtBearerToken,
} from "src";

export async function GET(req: Request) {
  const user = await verifyJwtBearerToken(req.headers.get("authorization"));
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let db = null;

  try {
    db = await dbClient();

    const data = await getAggregatedDonationsByEmail(
      db,
      user[process.env.AUTH0_EMAIL_CLAIM] as string,
    );

    return Response.json({
      status: 200,
      content: data.map((e) => ({
        id: mapToNorwegianOrgId(e.earmark),
        organization: e.earmark,
        abbriv: e.earmark,
        value: e.total,
        year: e.year,
      })),
    });
  } catch (e) {
    logError("donors/[id]/donations/aggregated: ", e);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
