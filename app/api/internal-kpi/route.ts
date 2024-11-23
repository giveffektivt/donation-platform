import { dbClient, dbRelease, getIgnoredRenewals } from "src";

export async function GET(req: Request) {
  let db = null;

  try {
    if (
      req.headers.get("Authorization") !==
      `Bearer ${process.env.INTERNAL_KPI_KEY}`
    ) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    db = await dbClient();

    const result = {
      ignored_renewals: await getIgnoredRenewals(db),
    };

    return Response.json(result);
  } catch (e) {
    console.error("api/internal-kpi: ", e);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
