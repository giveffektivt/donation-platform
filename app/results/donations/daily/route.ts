import { dbClient, dbRelease, getDailyDonatedStats, logError } from "src";

export async function GET() {
  let db = null;

  try {
    db = await dbClient();

    return Response.json({
      status: 200,
      content: await getDailyDonatedStats(db),
    });
  } catch (e) {
    logError("results/donations/daily: ", e);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
