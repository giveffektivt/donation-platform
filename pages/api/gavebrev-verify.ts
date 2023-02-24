import Cors from "cors";
import util from "util";
import type { NextApiRequest, NextApiResponse } from "next";
import {
  SubmitDataGavebrevIncome,
  validationSchemaGavebrevIncome,
  listGavebrev,
} from "src";
import * as yup from "yup";

type Data = {
  message: string;
  data?: {
    id: string;
    donated: number;
    debt_total: number;
    debt_past: number;
    income_inferred?: number;
    income_preliminary?: number;
    income_verified?: number;
  }[];
  errors?: object;
};

const cors = util.promisify(
  Cors({
    methods: ["GET", "PATCH"],
    origin: "http://localhost:3000",
  })
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  await cors(req, res);

  try {
    switch (req.method) {
      case "GET":
        return authorize(req, res) && (await handleListGavebrev(req, res));
      case "PATCH":
        return (
          authorize(req, res) && (await handleUpdateStatusGavebrev(req, res))
        );
      default:
        res.setHeader("Allow", "GET, PATCH");
        res.status(405).end("Method Not Allowed");
        return;
    }
  } catch (err) {
    console.error("api/gavebrev:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
}

function authorize(req: NextApiRequest, res: NextApiResponse<Data>): boolean {
  if (!process.env.GAVEBREV_API_KEY) {
    throw new Error("GAVEBREV_API_KEY is not defined");
  }

  if (req.headers.authorization !== `Bearer ${process.env.GAVEBREV_API_KEY}`) {
    res.status(401).json({ message: "Unauthorized" });
    return false;
  }

  return true;
}

async function handleListGavebrev(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const data = (await listGavebrev()).map((g) => {
    const income = /^[45]/.test(g.id)
      ? { income_inferred: 100_000 }
      : /^[6789]/.test(g.id)
      ? { income_preliminary: 500_000 }
      : { income_verified: 1_000_000 };

    return {
      id: g.id,
      donated: 70_000,
      debt_total: 40_000,
      debt_past: 10_000,
      ...income,
    };
  });

  res.status(200).json({
    message: "OK",
    data,
  });
}

async function handleUpdateStatusGavebrev(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  let submitData: SubmitDataGavebrevIncome | null = null;
  try {
    submitData = await yup
      .object()
      .shape(validationSchemaGavebrevIncome)
      .validate(req.body);
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      return res
        .status(400)
        .json({ message: "Validation failed", errors: err.errors });
    } else {
      throw err;
    }
  }

  res.status(200).json({ message: "OK" });
}
