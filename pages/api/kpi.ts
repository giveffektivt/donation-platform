import type { NextApiRequest, NextApiResponse } from "next";
import {
  Kpi,
  getKpi,
  dbClient,
  RecipientDistribution,
  getRecipientDistribution,
} from "src";

type Data = {
  kpi: Kpi;
  distribution: RecipientDistribution[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
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
