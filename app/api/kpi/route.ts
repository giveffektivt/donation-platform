import type { NextRequest } from "next/server";
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

export async function GET(request: NextRequest) {
  const from = toISO(request.nextUrl.searchParams.get("from"));
  const to = toISO(request.nextUrl.searchParams.get("to"));

  let db = null;

  try {
    db = await dbClient();

    const result = {
      kpi: await getKpi(db),
      pending: await getPendingDistribution(db),
      transferred: await getTransferredDistribution(db),
      transfer_overview: await getTransferOverview(db),
      collected: await getTimeDistribution(db, from, to),
    };

    return Response.json(result, {
      headers: {
        "Cache-Control": "s-maxage=10",
      },
    });
  } catch (e) {
    logError("api/kpi: ", e);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}

function toISO(timestamp: string | null): string | null {
  if (!timestamp) {
    return null;
  }

  try {
    return new Date(Number.parseInt(timestamp, 10)).toISOString();
  } catch {
    return null;
  }
}
