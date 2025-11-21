import type { NextRequest } from "next/server";
import { dbClient, dbRelease, getFundraiserSums, logError } from "src";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const ids = (params.get("ids") ?? "").split(",");

  let db = null;

  try {
    db = await dbClient();
    return Response.json({
      status: 200,
      content: await getFundraiserSums(db, ids),
    });
  } catch (err) {
    logError("fundraisers/donationsums:", err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
