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

export async function FetchSubscribers() {
  if (!process.env.MAILCHIMP_SUBSCRIBE_URL || !process.env.MAILCHIMP_API_KEY) {
    throw new Error("No Mailchimp subscribe URL or API key defined");
  }

  let total = 1;
  let fetched = 0;
  const subscribed_newsletter = new Set<string>();

  while (fetched < total) {
    const response = await fetch(
      `${process.env.MAILCHIMP_SUBSCRIBE_URL}?status=subscribed&fields=total_items,members.email_address,members.status&count=1000&offset=${fetched}`,
      {
        headers: {
          Authorization: getMailchimpAuthorizationHeader(),
        },
      },
    );
    if (!response.ok) {
      throw await response.text();
    }

    const data = await response.json();
    total = data.total_items;
    fetched += data.members.length;
    for (const m of data.members) {
      subscribed_newsletter.add(m.email_address);
    }
  }

  return subscribed_newsletter;
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
