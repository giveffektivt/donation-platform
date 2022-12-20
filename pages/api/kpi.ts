import Cors from "cors";
import type { NextApiRequest, NextApiResponse } from "next";
import util from "util";

import {
  dbClient,
  getKpi,
  getRecipientDistribution,
  getTimeDistribution,
  Kpi,
  RecipientDistribution,
  TimeDistribution,
} from "src";

const cors = util.promisify(
  Cors({
    methods: ["GET"],
    origin: "https://giveffektivt.dk",
  })
);

type Data = {
  kpi: Kpi;
  by_cause: RecipientDistribution[];
  by_time: TimeDistribution[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  await cors(req, res);

  const db = await dbClient();
  try {
    res.status(200).json({
      kpi: await getKpi(db),
      by_cause: await getRecipientDistribution(db),
      by_time: await getTimeDistribution(db),
    });
  } catch (e) {
    console.error("api/kpi: ", e);
    res.status(500);
  } finally {
    db.release();
  }
}
