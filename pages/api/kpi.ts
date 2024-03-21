import type { NextApiRequest, NextApiResponse } from "next";

import {
  cors,
  dbClient,
  dbRelease,
  getKpi,
  getPendingDistribution,
  getTransferredDistribution,
  getTimeDistribution,
  Kpi,
  PendingDistribution,
  TransferredDistribution,
  TimeDistribution,
} from "src";

type Data = {
  kpi: Kpi;
  pending: PendingDistribution[];
  transferred: TransferredDistribution[];
  collected: TimeDistribution[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  let db = null;

  try {
    await cors(req, res);

    db = await dbClient();

    const result = {
      kpi: await getKpi(db),
      pending: await getPendingDistribution(db),
      transferred: await getTransferredDistribution(db),
      collected: await getTimeDistribution(db),
    };

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(result, null, 4));
  } catch (e) {
    console.error("api/kpi: ", e);
    res.status(500);
  } finally {
    dbRelease(db);
  }
}
