import { dbClient, dbRelease, getKpi, logError } from "src";

export async function GET() {
  let db = null;

  try {
    db = await dbClient();
    const kpi = await getKpi(db);

    return Response.json({
      status: 200,
      content: {
        totalDonationsToRecommendedOrgs: kpi.dkk_total,
        numberOfDonors: kpi.number_of_donors,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (e) {
    logError("results/headline: ", e);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
