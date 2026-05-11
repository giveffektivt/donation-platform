import type { NextRequest } from "next/server";
import {
  dbClient,
  dbRelease,
  getKpi,
  getPendingDistribution,
  getTimeDistribution,
  getTransferOverview,
  getTransferredDistribution,
  logError,
} from "src";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const from = toISOOrDefault(params.get("from"), "2000-01-01T00:00:00.000Z");
  const to = toISOOrDefault(params.get("to"), "2100-01-01T00:00:00.000Z");

  const useDaily =
    Math.abs(new Date(to).getTime() - new Date(from).getTime()) <
    90 * 24 * 60 * 60 * 1000;

  let db = null;

  try {
    db = await dbClient();

    const [kpi, pending, transferred, transfer_overview, collected] =
      await Promise.all([
        getKpi(db),
        getPendingDistribution(db),
        getTransferredDistribution(db),
        getTransferOverview(db),
        getTimeDistribution(db, from, to, useDaily),
      ]);

    return Response.json(
      {
        kpi,
        pending,
        transferred,
        transfer_overview,
        collected,
      },
      {
        headers: {
          "Cache-Control": "s-maxage=10",
        },
      },
    );
  } catch (e) {
    logError("api/kpi: ", e);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}

function toISOOrDefault(timestamp: string | null, fallback: string): string {
  if (!timestamp) {
    return fallback;
  }
  const n = Number.parseInt(timestamp, 10);
  if (Number.isNaN(n)) {
    return fallback;
  }
  const d = new Date(n);
  return Number.isNaN(d.getTime()) ? fallback : d.toISOString();
}
