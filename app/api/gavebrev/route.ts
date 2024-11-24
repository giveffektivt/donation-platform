import {
  createGavebrev,
  type SubmitDataGavebrev,
  type SubmitDataGavebrevStatus,
  updateGavebrevStatus,
  validationSchemaGavebrev,
  validationSchemaGavebrevStatus,
  listGavebrev,
  type SubmitDataGavebrevStop,
  validationSchemaGavebrevStop,
  stopGavebrev,
  logError,
} from "src";
import * as yup from "yup";

function authorize(req: Request): boolean {
  if (!process.env.GAVEBREV_API_KEY) {
    throw new Error("GAVEBREV_API_KEY is not defined");
  }

  return (
    req.headers.get("Authorization") ===
    `Bearer ${process.env.GAVEBREV_API_KEY}`
  );
}

export async function GET(req: Request) {
  try {
    if (!authorize(req)) {
      logError("GET api/gavebrev: Unauthorized");
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    return Response.json({ message: "OK", data: await listGavebrev() });
  } catch (err) {
    logError("api/gavebrev:", err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!authorize(req)) {
      logError("POST api/gavebrev: Unauthorized");
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    let submitData: SubmitDataGavebrev | null = null;
    try {
      submitData = await yup
        .object()
        .shape(validationSchemaGavebrev)
        .validate(await req.json());
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        logError(
          "POST api/gavebrev: Validation failed for request body: ",
          err,
        );
        return Response.json(
          { message: "Validation failed", errors: err.errors },
          { status: 400 },
        );
      }
      throw err;
    }

    const agreementId = await createGavebrev(submitData);

    return Response.json({ message: "OK", agreementId });
  } catch (err) {
    logError("api/gavebrev:", err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!authorize(req)) {
      logError("PATCH api/gavebrev: Unauthorized");
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    let submitData: SubmitDataGavebrevStatus | null = null;
    try {
      submitData = await yup
        .object()
        .shape(validationSchemaGavebrevStatus)
        .validate(await req.json());
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        logError(
          "PATCH api/gavebrev: Validation failed for request body: ",
          err,
        );
        return Response.json(
          { message: "Validation failed", errors: err.errors },
          { status: 400 },
        );
      }
      throw err;
    }

    const found = await updateGavebrevStatus(submitData);
    if (!found) {
      logError(`PATCH api/gavebrev: agreement ${submitData.id} not found`);
      return Response.json({ message: "Not found" }, { status: 404 });
    }
    return Response.json({ message: "OK" });
  } catch (err) {
    logError("api/gavebrev:", err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!authorize(req)) {
      logError("DELETE api/gavebrev: Unauthorized");
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    let submitData: SubmitDataGavebrevStop | null = null;
    try {
      submitData = await yup
        .object()
        .shape(validationSchemaGavebrevStop)
        .validate(await req.json());
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        logError(
          "DELETE api/gavebrev: Validation failed for request body: ",
          err,
        );
        return Response.json(
          { message: "Validation failed", errors: err.errors },
          { status: 400 },
        );
      }
      throw err;
    }

    const found = await stopGavebrev(submitData);
    if (!found) {
      logError(`DELETE api/gavebrev: agreement ${submitData.id} not found`);
      return Response.json({ message: "Not found" }, { status: 404 });
    }
    return Response.json({ message: "OK" });
  } catch (err) {
    logError("api/gavebrev:", err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
}
