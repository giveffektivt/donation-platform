import {
  logError,
  type SubmitDataNewFundraiser,
  validationSchemaNewFundraiser,
  insertFundraiser,
  dbRelease,
  dbClient,
} from "src";
import * as yup from "yup";

export async function POST(req: Request) {
  let db = null;
  try {
    if (!process.env.FUNDRAISER_API_KEY) {
      throw new Error("FUNDRAISER_API_KEY is not defined");
    }

    if (
      req.headers.get("Authorization") !==
      `Bearer ${process.env.FUNDRAISER_API_KEY}`
    ) {
      logError("POST api/fundraiser: Unauthorized");
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    let submitData: SubmitDataNewFundraiser | null = null;
    try {
      submitData = await yup
        .object()
        .shape(validationSchemaNewFundraiser)
        .validate(await req.json());
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        logError(
          "POST api/fundraiser: Validation failed for request body: ",
          err,
        );
        return Response.json(
          { message: "Validation failed", errors: err.errors },
          { status: 400 },
        );
      }
      throw err;
    }

    db = await dbClient();
    const fundraiser = await insertFundraiser(db, {
      email: submitData.email,
      title: submitData.title,
      has_match: submitData.has_activity_match,
      match_currency: submitData.activity_match_currency,
    });

    return Response.json({
      message: "OK",
      id: fundraiser.id,
      admin: `${process.env.HOMEPAGE_URL}/indsamling-admin/?id=${fundraiser.id}#key=${fundraiser.key}`,
    });
  } catch (err) {
    logError("api/fundraiser:", err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
