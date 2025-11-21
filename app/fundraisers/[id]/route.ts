import { dbClient, dbRelease, getFundraiserNew, logError } from "src";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = (await params).id;

  if (!id.toString().includes("-")) {
    // silently ignore old non-uuid fundraisers
    return Response.json({
      status: 200,
      content: {
        totalSum: 0,
        transactions: [],
        donationCount: 0,
      },
    });
  }

  let db = null;

  try {
    db = await dbClient();
    return Response.json({
      status: 200,
      content: await getFundraiserNew(db, id),
    });
  } catch (err) {
    logError(`fundraisers/${id}:`, err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
