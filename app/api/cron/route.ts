import { charge, logError, sendNewEmails } from "src";

export async function POST(req: Request) {
  try {
    if (!process.env.CRON_API_KEY) {
      throw new Error("CRON_API_KEY is not defined");
    }

    if (
      req.headers.get("Authorization") !== `Bearer ${process.env.CRON_API_KEY}`
    ) {
      logError("api/cron: Unauthorized", {
        req: {
          len: req.headers.get("Authorization")?.length,
          pref: req.headers.get("Authorization")?.substring(0, 3),
        },
        env: {
          len: process.env.CRON_API_KEY?.length,
          pref: process.env.CRON_API_KEY?.substring(0, 3),
        },
      });
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    await charge();
    await sendNewEmails();

    return Response.json({ message: "OK" });
  } catch (err) {
    logError("api/cron:", err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
}
