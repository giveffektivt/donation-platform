import { logError } from "src";
import { z } from "zod";

const PayloadSchema = z.object({
  email: z.email().max(500),
  type: z.string().trim().min(1).max(500),
});

export async function POST(req: Request) {
  try {
    if (!process.env.BREVO_API_URL || !process.env.BREVO_API_KEY) {
      throw new Error("Missing required Brevo environment variables");
    }

    const { email, type } = await PayloadSchema.parseAsync(await req.json());
    const response = await fetch(`${process.env.BREVO_API_URL}/contacts`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        attributes: {
          DATO_LEAD_INDSENDELSE: new Date().toISOString().slice(0, 10),
          LEAD_KILDE: type,
        },
        updateEnabled: true,
      }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return Response.json({ status: 200, content: {} });
  } catch (err) {
    logError("forms/submit:", err);
    return Response.json({}, { status: 500 });
  }
}
