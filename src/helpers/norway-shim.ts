import { DonationRecipient, PaymentMethod } from "src/donation/types";

export const norwegianOrgs = [
  {
    name: "Smart fordeling",
    description:
      "Din donation fordeles efter Giv Effektivts anbefalinger for at skabe den størst mulige effekt.",
    infoUrl: "https://giveffektivt.dk/anbefalinger",
  },
  {
    name: DonationRecipient.MyggenetModMalaria,
    description: "Myggenet beskytter familier imod malariamyg, mens de sover.",
    infoUrl: "https://giveffektivt.dk/myggenet",
  },
  {
    name: DonationRecipient.MedicinModMalaria,
    description:
      "Der uddeles forebyggende malariamedicin i perioder, hvor smittetallet er særligt højt.",
    infoUrl: "https://giveffektivt.dk/malariamedicin",
  },
  {
    name: DonationRecipient.VitaminModMangelsygdomme,
    description:
      "A-vitamin til børn under 5 år reducerer børnedødelighed i 21 lande.",
    infoUrl: "https://giveffektivt.dk/a-vitamin",
  },
  {
    name: DonationRecipient.VaccinerTilSpædbørn,
    description:
      "Forældre får en økonomisk belønning for at få deres børn vaccineret.",
    infoUrl: "https://giveffektivt.dk/boernevacciner",
  },
  {
    name: DonationRecipient.KontantoverførslerTilVerdensFattigste,
    description:
      "Kontantoverførsler gives direkte til fattige familier, så de selv kan prioritere deres behov.",
    infoUrl: "https://giveffektivt.dk/kontantoverfoersler",
  },
  {
    name: DonationRecipient.GivEffektivtsArbejdeOgVækst,
    description:
      "Din støtte til Giv Effektivts arbejde bidrager til vores drift og sikrer ca. 10x mere i donationer til vores anbefalede velgørenhedsformål.",
    infoUrl: "https://giveffektivt.dk",
  },
];

export const mapFromNorwegianPaymentMethods = (method: number) => {
  switch (method) {
    case 99:
      return PaymentMethod.CreditCard;
    case 98:
      return PaymentMethod.MobilePay;
    case 2:
      return PaymentMethod.BankTransfer;
    case 97:
      return PaymentMethod.BankTransfer;
    default:
      throw new Error(`donation/register: Unknown payment method ${method}`);
  }
};

export const mapFromNorwegianOrgId = (id: number): DonationRecipient => {
  if (id === 1) {
    // TODO rename this in DB
    return DonationRecipient.GivEffektivtsAnbefaling;
  }
  if (id < 1 || id > norwegianOrgs.length) {
    throw new Error(`Unknown organization id ${id}`);
  }
  return norwegianOrgs[id - 1].name as DonationRecipient;
};

export const buildOrganizations = (
  orgs: { name: string; description: string; infoUrl: string }[],
) =>
  orgs.map((org, idx) => ({
    id: idx + 1,
    name: org.name,
    widgetDisplayName: org.name,
    widgetContext: null,
    abbreviation: org.name,
    shortDescription: org.description,
    longDescription: org.name,
    standardShare: idx === 0 ? 100 : 0,
    informationUrl: org.infoUrl,
    isActive: true,
    ordering: idx + 1,
    causeAreaId: 1,
  }));
