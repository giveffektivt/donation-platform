import type { NextRequest } from "next/server";
import {
  dbClient,
  dbRelease,
  getKpi,
  getPendingDistribution,
  getTimeDistribution,
  getTransferOverview,
  getTransferredDistribution,
  getDonationRecipientPath,
  logError,
  type Kpi,
  type PendingDistribution,
  type TimeDistribution,
  type TransferredDistribution,
} from "src";

const CACHE_TTL_MS = 30_000;

type HumanFriendlyEarmark<T> = Omit<T, "earmark"> & { earmark: string };

type KpiResponse = {
  kpi: Kpi;
  pending: HumanFriendlyEarmark<PendingDistribution>[];
  transferred: TransferredDistribution[];
  transfer_overview: HumanFriendlyEarmark<TransferredDistribution>[];
  collected: TimeDistribution[];
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
    await logError(`api/kpi: ${JSON.stringify({ from, to })}`, e);
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
      pending: withHumanFriendlyEarmarks(pending),
      transferred,
      transfer_overview: withHumanFriendlyEarmarks(transfer_overview),
      collected,
    };
  } finally {
    dbRelease(db);
  }
}

function withHumanFriendlyEarmarks<T extends { earmark: string }>(
  items: T[],
): HumanFriendlyEarmark<T>[] {
  return items.map(({ earmark, ...item }) => ({
    ...item,
    earmark: getDonationRecipientPath(earmark),
  }));
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
