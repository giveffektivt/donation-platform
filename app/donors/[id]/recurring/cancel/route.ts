import {
  dbClient,
  dbRelease,
  logError,
  setDonationCancelledByIdAndEmail,
  verifyJwtBearerToken,
} from "src";
import type { NextRequest } from "next/server";

export async function PUT(req: NextRequest) {
  const user = await verifyJwtBearerToken(req.headers.get("authorization"));
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return Response.json({ message: "Missing donation id" }, { status: 400 });
  }

  let db = null;

  try {
    db = await dbClient();

    const donation = await setDonationCancelledByIdAndEmail(
      db,
      id,
      user[process.env.AUTH0_EMAIL_CLAIM] as string,
    );

    if (!donation.rows[0]?.id) {
      return Response.json({ message: "Not found" }, { status: 404 });
    }

    return Response.json({ status: 200, content: true });
  } catch (e) {
    logError("donors/[id]/recurring/cancel: ", e);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
