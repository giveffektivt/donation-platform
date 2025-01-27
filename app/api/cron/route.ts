import {
  charge,
  dbClient,
  dbRelease,
  ExportToCrm,
  logError,
  sendNewEmails,
} from "src";

export async function POST(req: Request) {
  let db = null;
  try {
    if (!process.env.CRON_API_KEY) {
      throw new Error("CRON_API_KEY is not defined");
    }

    if (
      req.headers.get("Authorization") !== `Bearer ${process.env.CRON_API_KEY}`
    ) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    await charge();
    await sendNewEmails();

    if (process.env.CRM_EXPORT_ENABLED === "true") {
      db = await dbClient();
      await ExportToCrm(db);
    }

    return Response.json({ message: "OK" });
  } catch (err) {
    logError("api/cron:", err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
