import { dbExecuteInTransaction, logError } from "src";
import { sendFailedRecurringDonationEmails } from "src/donation/failed";

export async function POST(req: Request) {
  try {
    if (!process.env.FAILED_RECURRING_DONATIONS_API_KEY) {
      throw new Error("FAILED_RECURRING_DONATIONS_API_KEY is not defined");
    }

    if (
      req.headers.get("Authorization") !==
      `Bearer ${process.env.FAILED_RECURRING_DONATIONS_API_KEY}`
    ) {
      logError("api/failed-recurring-donations: Unauthorized");
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbExecuteInTransaction(async (db) => {
      await sendFailedRecurringDonationEmails(db, await req.json());
    });

    return Response.json({ message: "OK" });
  } catch (err) {
    logError("api/failed-recurring-donations:", err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
}
