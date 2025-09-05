import { dbClient, dbRelease, getFundraisers, logError } from "src";

export async function GET() {
  let db = null;

  try {
    db = await dbClient();
    return Response.json({
      status: 200,
      content: await getFundraisers(db),
    });
  } catch (err) {
    logError("fundraisers/list:", err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
