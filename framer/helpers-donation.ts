const canSubmitStep1 = (store: any): boolean => {
  const amount = parseAmount(store.amount);
  const frequency = parseFrequency(store.frequency);
  return (
    frequency !== "" &&
    amount !== "" &&
    (frequency === "match" ? amount > 0 : amount >= 1) &&
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

const isCprCvrPlausible = (tin: string): boolean => {
  if (tin.length === 11) {
    return isCprPlausible(tin);
  }
  if (tin.length === 8) {
    return /^\d{8}$/.test(tin);
  }
  return false;
};

const isCprPlausible = (tin: string): boolean => {
  if (tin.length !== 11) {
    return false;
  }

  const cprRegex = /^(\d{2})(\d{2})(\d{2})-\d{4}$/;
  const match = tin.match(cprRegex);
  if (!match) {
    return false;
  }

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);

  if (day < 1 || day > 31 || month < 1 || month > 12) {
    return false;
  }

  tin = tin.replace("-", "");
  const weights = [4, 3, 2, 7, 6, 5, 4, 3, 2, 1];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number.parseInt(tin.charAt(i), 10) * weights[i];
  }

  return sum % 11 === 0;
};

const parseRecipient = (value: string): string => {
  const index = value ? value.indexOf("(") : -1;
  return index > -1 ? value.slice(0, index).trim() : value;
};

const parseFrequency = (value: string): string => {
  const frequency = value.toLowerCase();
  return frequency === ""
    ? ""
    : frequency.includes("måned")
      ? "monthly"
      : frequency.includes("match")
        ? "match"
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
  partialName: string,
): number => {
  return recipients.findIndex((r) =>
    r.toLowerCase().includes(partialName.toLowerCase()),
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
    fundraiserId: store.fundraiserId,
    message: store.message ? store.message : null,
  };
};

type DonationResponse = {
  redirect?: string;
  bank?: { account: string; message: string };
};

const submitDonation = async (store: any, setStore: any) => {
  try {
    setStore({ isLoading: true });
    track("Donation form step 2 submitted", parseAmount(store.amount));

    const response: DonationResponse = await submitForm(
      store.env,
      "donation",
      prepareDonationPayload(store),
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
    notifyAboutClientSideError("submitDonation", err?.toString());
  }

  setStore({ isLoading: false });
};

// Test

export const _test = {
  isCprCvrValid,
  isCprCvrPlausible,
};
