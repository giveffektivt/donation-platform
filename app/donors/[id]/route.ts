export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = (await params).id;
  return Response.json({
    status: 200,
    content: {
      id,
      email: "hello@world.com",
      name: "John Doe",

      newsletter: true,
      registered: new Date().toISOString(),
    },
  });
}
