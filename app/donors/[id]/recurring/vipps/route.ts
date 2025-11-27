import {
  dbClient,
  dbRelease,
  getRecurringDonationsByEmail,
  logError,
  verifyJwtBearerToken,
} from "src";

export async function GET(req: Request) {
  const user = await verifyJwtBearerToken(req.headers.get("authorization"));
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let db = null;

  try {
    db = await dbClient();

    const donations = await getRecurringDonationsByEmail(
      db,
      user[process.env.AUTH0_EMAIL_CLAIM] as string,
    );

    return Response.json({
      status: 200,
      content: donations.map((d) => ({
        ID: d.id,
        status: d.cancelled ? "STOPPED" : "ACTIVE",
        donorID: 0,
        full_name: null,
        KID: d.id,
        timestamp_created: d.created_at.toISOString(),
        monthly_charge_day: d.monthly_charge_day,
        force_charge_date: null,
        paused_until_date: null,
        amount: d.amount,
        agreement_url_code: null,
      })),
    });
  } catch (e) {
    logError("donors/[id]/recurring/vipps: ", e);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
