export async function SubscribeToNewsletter(email: string, donorId: string) {
  if (!process.env.PIPEDRIVE_API_URL) {
    throw new Error("No Pipedrive API URL defined");
  }
  if (!process.env.PIPEDRIVE_API_KEY) {
    throw new Error("No Pipedrive API key defined");
  }

  const searchResult = await fetch(
    `${process.env.PIPEDRIVE_API_URL}/api/v2/persons/search?fields=email&exact_match=true&term=${email}`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Api-Token": process.env.PIPEDRIVE_API_KEY,
      },
    },
  );

  if (!searchResult.ok) {
    throw new Error(
      `Error subscribing ${donorId} to newsletter: search failed, ${searchResult.statusText}`,
    );
  }

  const id = (await searchResult.json())?.data?.items?.[0]?.item?.id;
  if (id) {
    const response = await fetch(
      `${process.env.PIPEDRIVE_API_URL}/api/v2/persons/${id}?include_fields=marketing_status`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Api-Token": process.env.PIPEDRIVE_API_KEY,
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Error subscribing ${donorId} to newsletter: get failed, ${response.statusText}`,
      );
    }

    const status = (await response.json())?.data?.marketing_status;
    if (status !== "subscribed") {
      throw new Error(
        `Donor ${donorId} previously unsubscribed but now wants to subscribe to newsletter again, this required manual action`,
      );
    }
    return;
  }

  const response = await fetch(
    `${process.env.PIPEDRIVE_API_URL}/api/v2/persons`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Token": process.env.PIPEDRIVE_API_KEY,
      },
      body: JSON.stringify({
        name: "Unknown",
        emails: [{ value: email, primary: true }],
        marketing_status: "subscribed",
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Error subscribing ${donorId} to newsletter: post failed, ${response.statusText}`,
    );
  }
}
