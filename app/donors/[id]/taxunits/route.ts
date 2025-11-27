import {
  dbClient,
  dbRelease,
  enumerateIds,
  getDonorsDetailedByEmail,
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

    const donors = await getDonorsDetailedByEmail(
      db,
      user[process.env.AUTH0_EMAIL_CLAIM] as string,
    );

    if (!donors.length) {
      return Response.json(
        { status: 404, content: "Not found" },
        { status: 404 },
      );
    }

    return Response.json({
      status: 200,
      content: enumerateIds(
        donors.map((d) => ({
          donorId: 0,
          name: d.name ?? "Anonym",
          ssn: d.tin ?? "",
          registered: d.created_at.toISOString(),
          archived: null,
          sumDonations: d.sum_donations,
          numDonations: d.num_donations,
          taxDeductions: d.tax_deductions,
        })),
      ),
    });
  } catch (e) {
    logError("donors/[id]/taxunits: ", e);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
