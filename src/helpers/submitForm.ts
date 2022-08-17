const options = (values: any) => {
  const options = {
    method: "POST",
    headers: { "Content-type": "application/json;charset=UTF-8" },
    body: JSON.stringify(values),
  };

  return options;
};

export const submitForm = async (
  values: any,
  bag: any,
  url: "/api/payment" | "/api/payment-en"
): Promise<void> => {
  const response = await fetch(url, options(values));

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const body = await response.json();

  if (body.redirect) {
    window.open(body.redirect, "_parent");
  } else if (body.bank) {
    values.bank = body.bank;
  } else {
    throw new Error(`Unexpected response from server: ${JSON.stringify(body)}`);
  }
};
