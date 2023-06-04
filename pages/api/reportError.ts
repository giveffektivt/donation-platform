import type { NextApiRequest, NextApiResponse } from "next";
import { cors } from "src";

type Data = {
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  await cors(req, res);
  console.error("Users are experiencing critical problems on the page");
  res.status(200).json({ message: "OK" });
}
