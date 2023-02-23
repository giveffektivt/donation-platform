import type { NextApiRequest, NextApiResponse } from "next";
import {
  createGavebrev,
  SubmitDataGavebrev,
  SubmitDataGavebrevStatus,
  confirmGavebrev,
  validationSchemaGavebrev,
  validationSchemaGavebrevStatus,
  listGavebrev,
} from "src";
import * as yup from "yup";

type Data = {
  message: string;
  data?: {
    id: string;
    status: string;
  }[];
  agreementId?: string;
  errors?: object;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    switch (req.method) {
      case "GET":
        return authorize(req, res) && (await handleListGavebrev(req, res));
      case "POST":
        return authorize(req, res) && (await handleCreateGavebrev(req, res));
      case "PATCH":
        return authorize(req, res) && (await handleConfirmGavebrev(req, res));
      default:
        res.setHeader("Allow", "GET, POST, PATCH");
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
  res.status(200).json({
    message: "OK",
    data: await listGavebrev(),
  });
}

async function handleCreateGavebrev(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  let submitData: SubmitDataGavebrev | null = null;
  try {
    submitData = await yup
      .object()
      .shape(validationSchemaGavebrev)
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

  const agreementId = await createGavebrev(submitData);

  res.status(200).json({
    message: "OK",
    agreementId,
  });
}

async function handleConfirmGavebrev(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  let submitData: SubmitDataGavebrevStatus | null = null;
  try {
    submitData = await yup
      .object()
      .shape(validationSchemaGavebrevStatus)
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

  const found = await confirmGavebrev(submitData);
  if (found) {
    res.status(200).json({ message: "OK" });
  } else {
    res.status(404).json({ message: "Not found" });
  }
}
