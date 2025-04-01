import { dbClient, dbRelease, ExportToCrm, logError } from "src";

export async function POST(req: Request) {
  let db = null;
  try {
    if (!process.env.CRM_EXPORT_API_KEY) {
      throw new Error("CRM_EXPORT_API_KEY is not defined");
    }

    if (
      req.headers.get("Authorization") !==
      `Bearer ${process.env.CRM_EXPORT_API_KEY}`
    ) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    db = await dbClient();
    await ExportToCrm(db);

    return Response.json({ message: "OK" });
  } catch (err) {
    logError("api/crm-export:", err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
