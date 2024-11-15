import {
  dbClient,
  dbRelease,
  getKpi,
  getPendingDistribution,
  getTransferredDistribution,
  getTimeDistribution,
  corsHeaders,
} from "src";

export async function OPTIONS(req: Request) {
  return new Response(null, {
    headers: corsHeaders(req.headers.get("Origin")),
  });
}

export async function GET(req: Request) {
  let db = null;

  try {
    db = await dbClient();

    const result = {
      kpi: await getKpi(db),
      pending: await getPendingDistribution(db),
      transferred: await getTransferredDistribution(db),
      collected: await getTimeDistribution(db),
    };

    return new Response(JSON.stringify(result, null, 4), {
      headers: {
        ...corsHeaders(req.headers.get("Origin")),
        "Content-Type": "application/json",
      },
    });
  } catch (e) {
    console.error("api/kpi: ", e);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
