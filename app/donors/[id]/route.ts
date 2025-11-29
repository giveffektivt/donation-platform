import {
  dbClient,
  dbRelease,
  getDonorByEmail,
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

    const donor = await getDonorByEmail(
      db,
      user[process.env.AUTH0_EMAIL_CLAIM] as string,
    );

    if (!donor) {
      return Response.json(
        { status: 404, content: "Not found" },
        { status: 404 },
      );
    }

    return Response.json({
      status: 200,
      content: {
        id: 0,
        email: user[process.env.AUTH0_EMAIL_CLAIM],
        name: donor.name,
        newsletter: false,
        registered: donor.created_at.toISOString(),
      },
    });
  } catch (e) {
    logError("donors/[id]: ", e);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  } finally {
    dbRelease(db);
  }
}
