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
