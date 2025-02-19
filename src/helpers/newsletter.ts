export async function SubscribeToNewsletter(email: string) {
  if (!process.env.HUBSPOT_SUBSCRIBE_URL) {
    throw new Error("No newsletter subscribe URL defined");
  }

  const response = await fetch(process.env.HUBSPOT_SUBSCRIBE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `email=${encodeURIComponent(email)}`,
  });

  if (!response.ok) {
    throw await response.text();
  }
}
