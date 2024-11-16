import { corsHeaders } from "src";

export async function OPTIONS(req: Request) {
  return new Response(null, {
    headers: corsHeaders(req.headers.get("Origin")),
  });
}

export async function POST(req: Request) {
  console.error("Users are experiencing critical problems on the page");
  return Response.json(
    { message: "OK" },
    {
      headers: corsHeaders(req.headers.get("Origin")),
    },
  );
}
