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
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    return Response.json({ message: "OK", data: await listGavebrev() });
  } catch (err) {
    console.error("api/gavebrev:", err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!authorize(req)) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    let submitData: SubmitDataGavebrev | null = null;
    try {
      submitData = await yup
        .object()
        .shape(validationSchemaGavebrev)
        .validate(req.body);
    } catch (err) {
      if (err instanceof yup.ValidationError) {
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
    console.error("api/gavebrev:", err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!authorize(req)) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    let submitData: SubmitDataGavebrevStatus | null = null;
    try {
      submitData = await yup
        .object()
        .shape(validationSchemaGavebrevStatus)
        .validate(req.body);
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        return Response.json(
          { message: "Validation failed", errors: err.errors },
          { status: 400 },
        );
      }
      throw err;
    }

    const found = await updateGavebrevStatus(submitData);
    if (found) {
      return Response.json({ message: "OK" });
    }
    return Response.json({ message: "Not found" }, { status: 404 });
  } catch (err) {
    console.error("api/gavebrev:", err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!authorize(req)) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    let submitData: SubmitDataGavebrevStop | null = null;
    try {
      submitData = await yup
        .object()
        .shape(validationSchemaGavebrevStop)
        .validate(req.body);
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        return Response.json(
          { message: "Validation failed", errors: err.errors },
          { status: 400 },
        );
      }
      throw err;
    }

    const found = await stopGavebrev(submitData);
    if (found) {
      return Response.json({ message: "OK" });
    }
    return Response.json({ message: "Not found" }, { status: 404 });
  } catch (err) {
    console.error("api/gavebrev:", err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
}
