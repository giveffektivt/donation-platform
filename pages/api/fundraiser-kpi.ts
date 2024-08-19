import type { NextApiRequest, NextApiResponse } from "next";

import {
  cors,
  dbClient,
  dbRelease,
  getFundraiserKpi,
  type FundraiserKpi,
} from "src";

type Data = {
  message?: string;
  data?: FundraiserKpi[];
};

const isUUIDv4 =
  /^([0-9a-fA-F]{8})-([0-9a-fA-F]{4})-([1-5][0-9a-fA-F]{3})-([89abAB][0-9a-fA-F]{3})-([0-9a-fA-F]{12})$/;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  let db = null;

  try {
    await cors(req, res);

    const id = req.query.id as string;
    if (!isUUIDv4.test(id)) {
      console.error(`api/fundraiser-kpi: ID '${id}' is not UUID`);
      return res.status(400).json({ message: "Invalid ID" });
    }

    const key = req.headers.authorization?.substring("Bearer ".length) ?? "";

    db = await dbClient();

    const result = await getFundraiserKpi(db, id, key);

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(result, null, 4));
  } catch (e) {
    console.error("api/fundraiser-kpi: ", e);
    res.status(500).end();
  } finally {
    dbRelease(db);
  }
}
