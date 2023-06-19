import type { NextApiRequest, NextApiResponse } from "next";

import {
  cors,
  dbClient,
  dbRelease,
  getKpi,
  getRecipientDistribution,
  getTimeDistribution,
  Kpi,
  RecipientDistribution,
  TimeDistribution,
} from "src";

type Data = {
  kpi: Kpi;
  by_cause: RecipientDistribution[];
  by_time: TimeDistribution[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  let db = null;

  try {
    await cors(req, res);

    db = await dbClient();
    const result = {
      kpi: await getKpi(db),
      by_cause: await getRecipientDistribution(db),
      by_time: await getTimeDistribution(db),
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
