const apiProd = "https://donation-platform.vercel.app";
const apiDev =
  "https://donation-platform-info-giveffektivt-giv-effektivts-projects.vercel.app";

const errorMessage = `
Der opstod en serverfejl. Prøv venligst igen. Skriv til os på donation@giveffektivt.dk \
hvis problemet opstår igen. Hvis muligt, så fortæl gerne, hvordan \
man kan fremprovokere fejlen.
`;

const isUUIDv4 =
  /^([0-9a-fA-F]{8})-([0-9a-fA-F]{4})-([1-5][0-9a-fA-F]{3})-([89abAB][0-9a-fA-F]{3})-([0-9a-fA-F]{12})$/;

const track = (event: string, amount?: number | "") => {
  // @ts-ignore
  if (typeof plausible !== "undefined") {
    const extra = amount ? { revenue: { currency: "DKK", amount } } : undefined;
    // @ts-ignore
    plausible(event, extra);
  }
};

// Danish amount inputs

const parseAmount = (value: string): number | "" => {
  const amount =
    value === ""
      ? ""
      : Number.parseFloat(value.replace(/\./g, "").replace(/,/g, "."));
  return Number.isNaN(amount) ? "" : amount;
};

const parseFormatAmount = (value: string): string => {
  return parseAmount(value).toLocaleString("da-DK");
};

// Server communication

const submitForm = async (env: string, path: string, payload: any) => {
  const response = await fetch(apiUrl(env, path), {
    method: "POST",
    headers: { "Content-type": "application/json;charset=UTF-8" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`${response.status}`);
  }

  return await response.json();
};

const notifyAboutClientSideError = (action: string, error?: string) => {
  console.error(`Client-side error in ${action}: ${error}`);
  if (error?.includes("NetworkError")) {
    return;
  }

  // @ts-ignore
  if (typeof Rollbar !== "undefined") {
    // @ts-ignore
    Rollbar.error(`Client-side error in ${action}: ${error}`);
  }
};

const apiUrl = (env: string, path: string): string => {
  return `${env === "prod" ? apiProd : apiDev}/api/${path}`;
};
