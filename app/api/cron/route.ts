import { charge, logError, sendNewEmails } from "src";

export async function POST(req: Request) {
  try {
    if (!process.env.CRON_API_KEY) {
      throw new Error("CRON_API_KEY is not defined");
    }

    const auth = req.headers.get("Authorization");
    if (auth !== `Bearer ${process.env.CRON_API_KEY}`) {
      logError("api/cron: Unauthorized", {
        req: {
          len: auth?.length,
          pref: auth?.substring(0, 10),
          suf: auth?.substring(auth.length - 3),
        },
        env: {
          len: process.env.CRON_API_KEY?.length,
          pref: process.env.CRON_API_KEY?.substring(0, 3),
          suf: process.env.CRON_API_KEY?.substring(
            process.env.CRON_API_KEY.length - 3,
          ),
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
