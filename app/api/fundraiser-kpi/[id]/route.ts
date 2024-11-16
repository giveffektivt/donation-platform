import { corsHeaders, dbClient, dbRelease, getFundraiserKpi } from "src";

const isUUIDv4 =
  /^([0-9a-fA-F]{8})-([0-9a-fA-F]{4})-([1-5][0-9a-fA-F]{3})-([89abAB][0-9a-fA-F]{3})-([0-9a-fA-F]{12})$/;

export async function OPTIONS(req: Request) {
  return new Response(null, {
    headers: corsHeaders(req.headers.get("Origin")),
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let db = null;

  try {
    const id = (await params).id;

    if (!isUUIDv4.test(id)) {
      console.error(`api/fundraiser-kpi: ID '${id}' is not UUID`);
      return Response.json({ message: "Invalid ID" }, { status: 400 });
    }

    const key =
      req.headers.get("authorization")?.substring("Bearer ".length) ?? "";

    db = await dbClient();

    const result = await getFundraiserKpi(db, id, key);

    return Response.json(result, {
      headers: corsHeaders(req.headers.get("Origin")),
    });
  } catch (e) {
    console.error("api/fundraiser-kpi: ", e);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
