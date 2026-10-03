import { logError } from "src";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await logError(`Donation widget changed: ${JSON.stringify(body)}`);

    return Response.json({ message: "OK" });
  } catch (err) {
    await logError("app/mail/mailersend/security/sanitynotification:", err);
    return Response.json({ message: "Something went wrong" }, { status: 500 });
  }
}
