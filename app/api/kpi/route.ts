import {
  dbClient,
  dbRelease,
  getKpi,
  getPendingDistribution,
  getTransferredDistribution,
  getTimeDistribution,
  logError,
  getTransferOverview,
} from "src";

export async function GET(_: Request) {
  let db = null;

  try {
    db = await dbClient();

    const result = {
      kpi: await getKpi(db),
      pending: await getPendingDistribution(db),
      transferred: await getTransferredDistribution(db),
      transfer_overview: await getTransferOverview(db),
      collected: await getTimeDistribution(db),
    };

    return new Response(JSON.stringify(result, null, 4), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (e) {
    logError("api/kpi: ", e);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
