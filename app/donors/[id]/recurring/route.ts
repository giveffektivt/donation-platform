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
        // obsolete
        ID: d.id,
        KID: d.gateway_metadata?.bank_msg ?? d.id,
        monthly_charge_day: d.monthly_charge_day ?? 0,
        status: d.cancelled ? "STOPPED" : "ACTIVE",
        timestamp_created: d.created_at.toISOString(),
        // new
        id: d.id,
        kid: d.gateway_metadata?.bank_msg ?? d.id,
        cancelled: d.cancelled,
        createdAt: d.created_at.toISOString(),
        chargeDay: d.monthly_charge_day,
        amount: d.amount,
        method: d.method,
      })),
    });
  } catch (e) {
    logError("donors/[id]/recurring: ", e);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
