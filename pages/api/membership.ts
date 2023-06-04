import type { NextApiRequest, NextApiResponse } from "next";
import {
  cors,
  processQuickpayMembership,
  SubmitDataMembership,
  validationSchemaMembership,
} from "src";
import * as yup from "yup";

type Data = {
  message: string;
  redirect?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    await cors(req, res);

    let submitData: SubmitDataMembership = await yup
      .object()
      .shape(validationSchemaMembership)
      .validate(req.body);

    const [redirect] = await processQuickpayMembership(submitData);

    res.status(200).json({
      message: "OK",
      redirect,
    });
  } catch (err) {
    console.error("api/membership:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
}
