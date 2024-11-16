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

const isCprCvrPlausible = (tin: string): boolean => {
  if (tin.length === 11) {
    return isCprPlausible(tin);
  }
  if (tin.length === 8) {
    return /^\d{8}$/.test(tin);
  }
  return false;
};

const toAmount = (value: string): string => {
  const parsed = /^[\d\.]+$/.test(value)
    ? parseInputAmount(value)
    : parseAmount(value);
  return parsed === "" ? "" : `${parsed.toLocaleString("da-DK")} kr`;
};

const parseInputAmount = (value: string): number | "" => {
  return value === "" ? "" : Number.parseFloat(value);
};

const parseAmount = (value: string): number | "" => {
  return value === ""
    ? ""
    : Number.parseFloat(value.replace(/\./g, "").replace(/,/g, "."));
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

const submitDonation = async (store: any, setStore: any) => {
  try {
    setStore({ isLoading: true });
    track("Donation form step 2 submitted", parseAmount(store.amount));

    const response = await submitForm(
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
    console.error(err);

    try {
      await reportError(store.env);
    } catch (e) {
      console.error(e);
    }
  }

  setStore({ isLoading: false });
};

// Test

export const _test = {
  isCprCvrValid,
  isCprCvrPlausible,
};
