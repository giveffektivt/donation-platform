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

const CACHE_TTL_MS = 30_000;

type KpiResponse = {
  kpi: Awaited<ReturnType<typeof getKpi>>;
  pending: Awaited<ReturnType<typeof getPendingDistribution>>;
  transferred: Awaited<ReturnType<typeof getTransferredDistribution>>;
  transfer_overview: Awaited<ReturnType<typeof getTransferOverview>>;
  collected: Awaited<ReturnType<typeof getTimeDistribution>>;
};

const responseCache = new Map<
  string,
  {
    expiresAt: number;
    promise: Promise<KpiResponse>;
  }
>();

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const from = toISOOrDefault(params.get("from"), "2000-01-01T00:00:00.000Z");
  const to = toISOOrDefault(params.get("to"), "2100-01-01T00:00:00.000Z");

  const useDaily =
    Math.abs(new Date(to).getTime() - new Date(from).getTime()) <
    90 * 24 * 60 * 60 * 1000;

  try {
    const response = await getCachedKpiResponse(
      `${from}:${to}`,
      from,
      to,
      useDaily,
    );

    return Response.json(response);
  } catch (e) {
    logError("api/kpi: ", e);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
}

async function getCachedKpiResponse(
  key: string,
  from: string,
  to: string,
  useDaily: boolean,
): Promise<KpiResponse> {
  const cached = responseCache.get(key);
  const now = Date.now();

  if (cached) {
    if (cached.expiresAt === 0 || cached.expiresAt > now) {
      return cached.promise;
    }

    responseCache.delete(key);
  }

  const entry = {
    expiresAt: 0,
    promise: getKpiResponse(from, to, useDaily),
  };

  responseCache.set(key, entry);

  void entry.promise
    .then(() => {
      entry.expiresAt = Date.now() + CACHE_TTL_MS;
    })
    .catch(() => {
      if (responseCache.get(key) === entry) {
        responseCache.delete(key);
      }
    });

  return entry.promise;
}

async function getKpiResponse(
  from: string,
  to: string,
  useDaily: boolean,
): Promise<KpiResponse> {
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

    return {
      kpi,
      pending,
      transferred,
      transfer_overview,
      collected,
    };
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
