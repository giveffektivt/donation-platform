const canSubmitMembership = (store: any): boolean => {
  return (
    store.name !== "" &&
    (isDenmark(store.country) ? isCprValid(store.tin) : store.tin !== "") &&
    store.email.includes("@") &&
    store.address !== "" &&
    store.postcode !== "" &&
    store.city !== "" &&
    store.country !== "" &&
    (isDenmark(store.country)
      ? true
      : /^\d{4}-\d{2}-\d{2}$/.test(store.birthday)) &&
    !store.isLoading
  );
};

const isDenmark = (country: string): boolean =>
  ["Danmark", "Denmark"].includes(country);

const isCprValid = (tin: string): boolean => {
  return tin.length === 11;
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

const prepareMembershipPayload = (store: any) => {
  return {
    name: store.name,
    tin: store.tin,
    email: store.email,
    address: store.address,
    postcode: store.postcode,
    city: store.city,
    country: store.country === "Danmark" ? "Denmark" : store.country,
    birthday: store.birthday,
  };
};

const submitMembership = async (store: any, setStore: any) => {
  try {
    setStore({ isLoading: true });
    track("Membership form submitted", 50);

    const response = await submitForm(
      store.env,
      "membership",
      prepareMembershipPayload(store),
    );

    if (response.redirect) {
      window.open(response.redirect, "_parent");
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
