export async function SubscribeToNewsletter(email: string) {
  if (
    !process.env.BREVO_API_URL ||
    !process.env.BREVO_API_KEY ||
    !process.env.BREVO_NEWSLETTER_LIST_IDS
  ) {
    throw new Error("Missing required newsletter environment variables");
  }

  const response = await fetch(`${process.env.BREVO_API_URL}/contacts/import`, {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      disableNotification: true,
      updateExistingContacts: true,
      emptyContactsAttributes: false,
      jsonBody: [{ email }],
      listIds: (process.env.BREVO_NEWSLETTER_LIST_IDS ?? "")
        .split(",")
        .map((id) => Number(id.trim()))
        .filter((id) => !Number.isNaN(id)),
    }),
  });

  if (!response.ok) {
    throw await response.text();
  }
}
