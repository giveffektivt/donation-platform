import Cors from "cors";
import type { NextApiRequest, NextApiResponse } from "next";
import util from "util";

import {
  dbClient,
  getKpi,
  getRecipientDistribution,
  Kpi,
  RecipientDistribution,
} from "src";

const cors = util.promisify(
  Cors({
    methods: ["GET"],
    origin: "https://giveffektivt.dk",
  })
);

type Data = {
  kpi: Kpi;
  distribution: RecipientDistribution[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  await cors(req, res);

  const db = await dbClient();
  try {
    const kpi = await getKpi(db);
    const distribution = await getRecipientDistribution(db);
    res.status(200).json({
      kpi,
      distribution,
    });
  } catch (e) {
    console.error("api/kpi: ", e);
    res.status(500);
  } finally {
    db.release();
  }
}
