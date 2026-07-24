import { DonationRecipient, PaymentMethod } from "src/donation/types";

type NorwegianOrg = {
  id: number;
  name: string;
  widgetDisplayName?: string;
  description: string;
  infoUrl: string;
  causeAreaId: number;
  isActive?: boolean;
};

export const norwegianOrgs: NorwegianOrg[] = [
  {
    id: 1,
    name: DonationRecipient.SmartFordeling,
    description:
      "Din donation fordeles efter Giv Effektivts anbefalinger for at skabe den størst mulige effekt.",
    infoUrl: "https://giveffektivt.dk/anbefalinger",
    causeAreaId: 99,
  },
  {
    id: 2,
    name: DonationRecipient.SmartFordelingGlobalSundhed,
    widgetDisplayName: DonationRecipient.SmartFordeling,
    description:
      "Din donation fordeles efter Giv Effektivts anbefalinger for at skabe den størst mulige effekt inden for global sundhed.",
    infoUrl: "https://giveffektivt.dk/anbefalinger",
    causeAreaId: 1,
  },
  {
    id: 3,
    name: DonationRecipient.MyggenetModMalaria,
    description: "Myggenet beskytter familier imod malariamyg, mens de sover.",
    infoUrl: "https://giveffektivt.dk/myggenet",
    causeAreaId: 1,
  },
  {
    id: 4,
    name: DonationRecipient.MedicinModMalaria,
    description:
      "Der uddeles forebyggende malariamedicin i perioder, hvor smittetallet er særligt højt.",
    infoUrl: "https://giveffektivt.dk/malariamedicin",
    causeAreaId: 1,
  },
  {
    id: 5,
    name: DonationRecipient.VitaminModMangelsygdomme,
    description:
      "A-vitamin til børn under 5 år reducerer børnedødelighed i 21 lande.",
    infoUrl: "https://giveffektivt.dk/a-vitamin",
    causeAreaId: 1,
  },
  {
    id: 6,
    name: DonationRecipient.VaccinerTilSpædbørn,
    description:
      "Forældre får en økonomisk belønning for at få deres børn vaccineret.",
    infoUrl: "https://giveffektivt.dk/boernevacciner",
    causeAreaId: 1,
  },
  {
    id: 7,
    name: DonationRecipient.KontantoverførslerTilVerdensFattigste,
    description:
      "Kontantoverførsler gives direkte til fattige familier, så de selv kan prioritere deres behov.",
    infoUrl: "https://giveffektivt.dk/kontantoverfoersler",
    causeAreaId: 1,
  },
  {
    id: 8,
    name: DonationRecipient.GivEffektivtsArbejdeOgVækst,
    description:
      "Din støtte til Giv Effektivts arbejde bidrager til vores drift og sikrer ca. 7x mere i donationer til vores anbefalede velgørenhedsformål.",
    infoUrl: "https://giveffektivt.dk/x-faktor",
    causeAreaId: 4,
  },
  {
    id: 9,
    name: "Ormekure",
    description:
      "Ormekure til skolebørn forbedrer sundhed og øger skolegang og fremtidig indkomst.",
    infoUrl: "https://giveffektivt.dk",
    causeAreaId: 1,
    isActive: false,
  },
  // {
  //   id: 30,
  //   name: DonationRecipient.SmartFordelingDyrevelfærd,
  //   widgetDisplayName: DonationRecipient.SmartFordeling,
  //   description:
  //     "Din donation fordeles efter Giv Effektivts anbefalinger for at skabe den størst mulige effekt inden for dyrevelfærd.",
  //   infoUrl: "https://giveffektivt.dk/anbefalinger",
  //   causeAreaId: 2,
  // },
  {
    id: 50,
    name: DonationRecipient.Andet,
    description: "Donationer knyttet til særlige aftaler.",
    infoUrl: "https://giveffektivt.dk",
    causeAreaId: 5,
    isActive: false,
  },
];

export const norwegianCauseAreas = [
  {
    id: 99,
    name: "Vores anbefaling",
    description: "Vores anbefaling",
    standardPercentageShare: 100,
    isActive: false,
  },
  {
    id: 1,
    name: "Global sundhed",
    description: "Global sundhed",
    standardPercentageShare: 0,
    isActive: true,
  },
  // {
  //   id: 2,
  //   name: "Dyrevelfærd",
  //   description: "Dyrevelfærd",
  //   standardPercentageShare: 0,
  //   isActive: true,
  // },
  {
    id: 4,
    name: "Giv Effektivts arbejde og vækst",
    description: "Giv Effektivts arbejde og vækst",
    standardPercentageShare: 0,
    isActive: true,
  },
  {
    id: 5,
    name: "Andet",
    description: "Andet",
    standardPercentageShare: 0,
    isActive: false,
  },
];

export const mapFromNorwegianPaymentMethods = (method: number) => {
  switch (method) {
    case 99:
      return PaymentMethod.CreditCard;
    case 98:
      return PaymentMethod.MobilePay;
    case 2:
    case 97:
      return PaymentMethod.BankTransfer;
    default:
      throw new Error(`donation/register: Unknown payment method ${method}`);
  }
};

export const mapFromNorwegianOrgId = (id: number): DonationRecipient => {
  const org = norwegianOrgs.find((candidate) => candidate.id === id);
  if (!org) {
    throw new Error(`Unknown organization id ${id}`);
  }
  return org.name as DonationRecipient;
};

export const mapToNorwegianOrgId = (recipient: string): number => {
  if (recipient === "Stor og velkendt effekt") {
    return 1;
  }
  if (recipient === DonationRecipient.GivEffektivtsMedlemskab) {
    return 99;
  }
  if (recipient === "Ormekur") {
    return 98;
  }
  const org = norwegianOrgs.find((candidate) => candidate.name === recipient);
  if (org) {
    return org.id;
  }
  throw new Error(`Unknown organization ${recipient}`);
};

export const enumerateIds = (data: object[]) =>
  data.map((item, idx) => ({
    id: idx + 1,
    ...item,
  }));

export const toTaxUnit = (donor: any, idx: number) => ({
  id: idx + 1,
  donorId: 0,
  name: donor.name ?? "Anonym",
  ssn: donor.tin ?? "",
  registered: donor.created_at.toISOString(),
  archived: null,
  sumDonations: donor.sum_donations,
  numDonations: donor.num_donations,
  taxDeductions: donor.tax_deductions,
});

export const buildOrganizations = (orgs: NorwegianOrg[]) =>
  orgs.map((org, idx) => ({
    id: org.id,
    name: org.name,
    widgetDisplayName: org.widgetDisplayName ?? org.name,
    widgetContext: null,
    shortDescription: org.description,
    longDescription: org.name,
    standardShare: idx === 0 ? 100 : 0,
    informationUrl: org.infoUrl,
    isActive: org.isActive ?? true,
    ordering: idx + 1,
    causeAreaId: org.causeAreaId,
  }));
