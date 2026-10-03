import {
  dbClient,
  dbRelease,
  getFundraiserKpi,
  logError,
  logRequestError,
} from "src";

const isUUIDv4 =
  /^([0-9a-fA-F]{8})-([0-9a-fA-F]{4})-([1-5][0-9a-fA-F]{3})-([89abAB][0-9a-fA-F]{3})-([0-9a-fA-F]{12})$/;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let db = null;
  let id: string | undefined;

  try {
    id = (await params).id;

    if (!isUUIDv4.test(id)) {
      await logError(`api/fundraiser-kpi: ID '${id}' is not UUID`);
      return Response.json({ message: "Invalid ID" }, { status: 400 });
    }

    const key =
      req.headers.get("authorization")?.substring("Bearer ".length) ?? "";

    db = await dbClient();

    const result = await getFundraiserKpi(db, id, key);

    return Response.json(result);
  } catch (e) {
    await logRequestError("GET api/fundraiser-kpi/[id]:", e, { id });
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
