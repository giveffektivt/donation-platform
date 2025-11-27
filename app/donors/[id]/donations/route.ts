import {
  dbClient,
  dbRelease,
  enumerateIds,
  getDonationsByEmail,
  getDonorIdsByEmail,
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

    const donations = await getDonationsByEmail(
      db,
      user[process.env.AUTH0_EMAIL_CLAIM] as string,
    );

    const donorIds = (
      await getDonorIdsByEmail(
        db,
        user[process.env.AUTH0_EMAIL_CLAIM] as string,
      )
    ).map((p) => p.id);

    if (!donations.length) {
      return Response.json(
        { status: 404, content: "Not found" },
        { status: 404 },
      );
    }

    return Response.json({
      status: 200,
      content: enumerateIds(
        donations.map((d) => ({
          donor: d.name ?? "",
          donorId: 0,
          email: d.email,
          sum: d.amount,
          transactionCost: 0,
          paymentMethod: d.method,
          KID: d.donation_id,
          taxUnitId: donorIds.indexOf(d.donor_id) + 1,
          timestamp: d.charged_at.toISOString(),
        })),
      ),
    });
  } catch (e) {
    logError("donors/[id]/donations: ", e);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
