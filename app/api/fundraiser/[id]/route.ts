import {
  dbClient,
  dbRelease,
  getFundraiser,
  logError,
  logRequestError,
} from "src";

const isUUIDv4 =
  /^([0-9a-fA-F]{8})-([0-9a-fA-F]{4})-([1-5][0-9a-fA-F]{3})-([89abAB][0-9a-fA-F]{3})-([0-9a-fA-F]{12})$/;

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let db = null;
  let id: string | undefined;

  try {
    id = (await params).id;
    if (!isUUIDv4.test(id)) {
      await logError(`api/fundraiser: ID '${id}' is not UUID`);
      return Response.json({ message: "Invalid ID" }, { status: 400 });
    }

    db = await dbClient();
    const result = await getFundraiser(db, id);
    if (!result) {
      await logError(`api/fundraiser: ID '${id}' not found in DB`);
      return Response.json({ message: "Invalid ID" }, { status: 400 });
    }

    return Response.json(result);
  } catch (err) {
    await logRequestError("GET api/fundraiser/[id]:", err, { id });
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
