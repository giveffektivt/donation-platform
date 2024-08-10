import type { NextApiRequest, NextApiResponse } from "next";
import { cors, dbClient, dbRelease, getFundraiser } from "src";

type Data = {
  message: string;
  url?: string;
  errors?: object;
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
      console.error(`api/fundraiser: ID '${id}' is not UUID`);
      return res.status(400).json({ message: "Invalid ID" });
    }

    db = await dbClient();
    const result = await getFundraiser(db, id);
    if (!result) {
      console.error(`api/fundraiser: ID '${id}' not found in DB`);
      return res.status(400).json({ message: "Invalid ID" });
    }

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(result, null, 4));
  } catch (err) {
    console.error("api/fundraiser:", err);
    res.status(500).json({ message: "Something went wrong" });
  } finally {
    dbRelease(db);
  }
}
