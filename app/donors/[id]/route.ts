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

  const email = user[process.env.AUTH0_EMAIL_CLAIM] as string;

  const allowedUsers = process.env.MINSIDE_ALLOWED;
  if (allowedUsers && !allowedUsers.includes(email)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let db = null;

  try {
    db = await dbClient();

    const donor = await getDonorByEmail(db, email);

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
        email,
        name: donor.name ?? "Anonym",
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
