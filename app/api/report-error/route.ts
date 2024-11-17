export async function POST(req: Request) {
  console.error(
    "Users are experiencing critical problems on the page",
    await req.text(),
  );
  return Response.json({ message: "OK" });
}
