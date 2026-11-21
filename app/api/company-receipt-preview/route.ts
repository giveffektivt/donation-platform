import { renderCompanyReceipt } from "src/company-receipts/render";
import { DonationRecipient } from "src/donation/types";

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development")
    return new Response(null, { status: 404 });

  const receipt = await renderCompanyReceipt(
    {
      short_id: "c-abcd",
      charged_at: new Date("2026-11-21T12:00:00Z"),
      amount: 500,
      tax_deductible: true,
      earmarks: [
        { recipient: DonationRecipient.Myggenet, amount: 175 },
        { recipient: DonationRecipient.Malariamedicin, amount: 125 },
        { recipient: DonationRecipient.SmartFordelingDyr, amount: 200 },
      ],
    },
    ["Eksempel ApS", "Eksempelvej 1", "1620 København V", "CVR: 12345678"],
    true,
  );

  if (new URL(request.url).searchParams.get("format") === "pdf") {
    return new Response(new Uint8Array(receipt.attachments[1].content), {
      headers: { "Content-Type": "application/pdf" },
    });
  }
  return new Response(receipt.html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
