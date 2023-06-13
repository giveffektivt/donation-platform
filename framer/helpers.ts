const apiProd = "https://donation-platform.vercel.app";
const apiDev = "https://donation-platform-info-giveffektivt.vercel.app";

const errorMessage = `
Der opstod en serverfejl. Prøv venligst igen. Skriv til os på donation@giveffektivt.dk \
hvis problemet opstår igen. Hvis muligt, så fortæl gerne, hvordan \
man kan fremprovokere fejlen.
`;

const canSubmitStep1 = (store: any): boolean => {
  return (
    store.frequency !== "" &&
    store.amount !== "" &&
    isCprCvrValid(store.taxDeductible, store.tin)
  );
};

const canSubmitStep2 = (store: any): boolean => {
  return (
    store.method !== "" &&
    store.email.includes("@") &&
    store.rulesAccepted &&
    !store.isLoading
  );
};

const isCprCvrValid = (taxDeductible: boolean, tin: string): boolean => {
  return !taxDeductible || [8, 11].includes(tin.length);
};

const toAmount = (value: string): string => {
  const parsed = parseAmount(value);
  return parsed === "" ? "" : `${parsed.toLocaleString("da-DK")} kr`;
};

const parseAmount = (value: string): number | "" => {
  return value === "" ? "" : parseInt(value.replace(/\./g, ""));
};

const parseRecipient = (value: string): string => {
  let index = value ? value.indexOf("(") : -1;
  return index > -1 ? value.slice(0, index).trim() : value;
};

const parseFrequency = (value: string): string => {
  const frequency = value.toLowerCase();
  return frequency === ""
    ? ""
    : frequency.includes("måned")
    ? "monthly"
    : "once";
};

const parseMethod = (value: string): string => {
  const method = value.toLowerCase();
  return method === ""
    ? ""
    : method.includes("bank")
    ? "Bank transfer"
    : method.includes("mobile")
    ? "MobilePay"
    : "Credit card";
};

const findRecipientIndex = (
  recipients: string[],
  partialName: string
): number => {
  return recipients.findIndex((r) =>
    r.toLowerCase().includes(partialName.toLowerCase())
  );
};

const prepareDonationPayload = (store: any) => {
  return {
    amount: parseAmount(store.amount),
    recipient: parseRecipient(store.recipient),
    frequency: parseFrequency(store.frequency),
    taxDeductible: store.taxDeductible,
    tin: store.taxDeductible ? store.tin : "",
    email: store.email,
    method: parseMethod(store.method),
    rulesAccepted: store.rulesAccepted,
    subscribeToNewsletter: store.subscribeToNewsletter,
  };
};

const submitDonation = async (store: any, setStore: any) => {
  try {
    setStore({ isLoading: true });

    const response = await submitForm(
      store.env,
      "donation",
      prepareDonationPayload(store)
    );

    if (response.redirect) {
      window.open(response.redirect, "_parent");
    } else if (response.bank) {
      setStore({
        bank: response.bank,
        step: "Bank",
      });
    }
  } catch (err) {
    alert(errorMessage);
    console.error(err);

    try {
      await reportError(store.env);
    } catch (e) {
      console.error(e);
    }
  }

  setStore({ isLoading: false });
};

// Server communication

type DonationResponse = {
  redirect?: string;
  bank?: { account: string; message: string };
};

const submitForm = async (
  env: string,
  path: string,
  payload: any
): Promise<DonationResponse> => {
  const response = await fetch(apiUrl(env, path), {
    method: "POST",
    headers: { "Content-type": "application/json;charset=UTF-8" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  return await response.json();
};

const reportError = async (env: string) => {
  const response = await fetch(apiUrl(env, "reportError"), { method: "POST" });

  if (!response.ok) {
    throw new Error("Unable to submit report about the critical error");
  }
};

const apiUrl = (env: string, path: string): string => {
  return `${env === "prod" ? apiProd : apiDev}/api/${path}`;
};

// Test

export const _test = {
  isCprCvrValid,
};
