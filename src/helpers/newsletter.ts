export async function SubscribeToNewsletter(email: string) {
  if (!process.env.MAILCHIMP_SUBSCRIBE_URL) {
    throw new Error("No Mailchimp subscribe URL defined");
  }

  const response = await fetch(
    `${process.env.MAILCHIMP_SUBSCRIBE_URL}/${email}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: getMailchimpAuthorizationHeader(),
      },
      body: JSON.stringify({
        email_address: email,
        status: "subscribed",
        status_if_new: "subscribed",
      }),
    },
  );

  if (!response.ok) {
    throw await response.text();
  }
}

function getMailchimpAuthorizationHeader() {
  if (!process.env.MAILCHIMP_API_KEY) {
    throw new Error("No Mailchimp API key defined");
  }

  const base64key = Buffer.from(
    `key:${process.env.MAILCHIMP_API_KEY}`,
  ).toString("base64");
  return `Basic ${base64key}`;
}
