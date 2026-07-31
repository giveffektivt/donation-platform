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
    id: -1,
    name: DonationRecipient.SmartFordeling,
    description:
      "Din donation fordeles efter Giv Effektivts anbefalinger for at skabe den størst mulige effekt.",
    infoUrl: "/smart-fordeling",
    causeAreaId: -1,
  },
  {
    id: 1,
    name: DonationRecipient.SmartFordelingGlobalSundhed,
    widgetDisplayName: DonationRecipient.SmartFordeling,
    description:
      "Din donation fordeles efter Giv Effektivts anbefalinger for at skabe den størst mulige effekt inden for global sundhed.",
    infoUrl: "/smart-fordeling",
    causeAreaId: 1,
  },
  {
    id: 2,
    name: DonationRecipient.MyggenetModMalaria,
    description: "Myggenet beskytter familier imod malariamyg, mens de sover.",
    infoUrl: "/myggenet",
    causeAreaId: 1,
  },
  {
    id: 3,
    name: DonationRecipient.MedicinModMalaria,
    description:
      "Der uddeles forebyggende malariamedicin i perioder, hvor smittetallet er særligt højt.",
    infoUrl: "/malariamedicin",
    causeAreaId: 1,
  },
  {
    id: 4,
    name: DonationRecipient.AVitaminModFejlernæring,
    description:
      "A-vitamin til børn under 5 år reducerer børnedødelighed i 21 lande.",
    infoUrl: "/a-vitamin",
    causeAreaId: 1,
  },
  {
    id: 5,
    name: DonationRecipient.VaccinerTilSpædbørn,
    description:
      "Forældre får en økonomisk belønning for at få deres børn vaccineret.",
    infoUrl: "/bornevacciner",
    causeAreaId: 1,
  },
  {
    id: 6,
    name: DonationRecipient.KontantoverførslerTilVerdensFattigste,
    description:
      "Kontantoverførsler gives direkte til fattige familier, så de selv kan prioritere deres behov.",
    infoUrl: "/kontantoverforsler",
    causeAreaId: 1,
  },
  {
    id: 7,
    name: "Ormekure",
    description:
      "Ormekure til skolebørn forbedrer sundhed og øger skolegang og fremtidig indkomst.",
    infoUrl: "/",
    causeAreaId: 1,
    isActive: false,
  },
  // {
  //   id: 20,
  //   name: DonationRecipient.SmartFordelingDyrevelfærd,
  //   widgetDisplayName: DonationRecipient.SmartFordeling,
  //   description:
  //     "Din donation fordeles efter Giv Effektivts anbefalinger for at skabe den størst mulige effekt inden for dyrevelfærd.",
  //   infoUrl: "/smart-fordeling",
  //   causeAreaId: 2,
  // },
  {
    id: 40,
    name: DonationRecipient.GivEffektivtsArbejdeOgVækst,
    description:
      "Din støtte til Giv Effektivts arbejde bidrager til vores drift og sikrer ca. 7x mere i donationer til vores anbefalede velgørenhedsformål.",
    infoUrl: "/x-faktor",
    causeAreaId: 4,
  },
  {
    id: 50,
    name: DonationRecipient.Andet,
    description: "Donationer knyttet til særlige aftaler.",
    infoUrl: "/",
    causeAreaId: 5,
    isActive: false,
  },
  {
    id: 99,
    name: DonationRecipient.GivEffektivtsMedlemskab,
    description: DonationRecipient.GivEffektivtsMedlemskab,
    infoUrl: "/",
    causeAreaId: 99,
    isActive: false,
  },
];

export const norwegianCauseAreas = [
  {
    id: -1,
    name: "Smart fordeling",
    description: "Smart fordeling",
    standardPercentageShare: 100,
    standardOrganizationId: -1,
    isActive: false,
  },
  {
    id: 1,
    name: "Global sundhed",
    description: "Global sundhed",
    standardPercentageShare: 0,
    standardOrganizationId: 1,
    isActive: true,
  },
  // {
  //   id: 2,
  //   name: "Dyrevelfærd",
  //   description: "Dyrevelfærd",
  //   standardPercentageShare: 0,
  //   standardOrganizationId: 20,
  //   isActive: true,
  // },
  {
    id: 4,
    name: "Giv Effektivts arbejde og vækst",
    description: "Giv Effektivts arbejde og vækst",
    standardPercentageShare: 0,
    standardOrganizationId: 40,
    isActive: true,
  },
  {
    id: 5,
    name: "Andet",
    description: "Andet",
    standardPercentageShare: 0,
    standardOrganizationId: 50,
    isActive: false,
  },
  {
    id: 99,
    name: DonationRecipient.GivEffektivtsMedlemskab,
    description: DonationRecipient.GivEffektivtsMedlemskab,
    standardPercentageShare: 0,
    standardOrganizationId: 99,
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
  if (recipient === "Ormekur") {
    return 98;
  }
  const org = norwegianOrgs.find((candidate) => candidate.name === recipient);
  if (org) {
    return org.id;
  }
  throw new Error(`Unknown organization ${recipient}`);
};

export const buildNorwegianCauseAreaDistribution = (
  earmarks: { recipient: string; amount: number }[],
  donationAmount: number,
) => {
  const causeAreas = norwegianCauseAreas
    .map((causeArea) => {
      const causeAreaEarmarks = earmarks.filter((earmark) => {
        const orgId = mapToNorwegianOrgId(earmark.recipient);
        return (
          norwegianOrgs.find((org) => org.id === orgId)?.causeAreaId ===
          causeArea.id
        );
      });
      const amount = causeAreaEarmarks.reduce(
        (sum, earmark) => sum + earmark.amount,
        0,
      );
      const standardSplit =
        causeAreaEarmarks.length === 1 &&
        mapToNorwegianOrgId(causeAreaEarmarks[0].recipient) ===
          causeArea.standardOrganizationId;

      return {
        id: causeArea.id,
        name: causeArea.name,
        standardSplit,
        amount,
        percentageShare: (amount / donationAmount) * 100,
        organizations: causeAreaEarmarks.map((earmark) => ({
          id: mapToNorwegianOrgId(earmark.recipient),
          name: earmark.recipient,
          amount: earmark.amount,
          percentageShare: (earmark.amount / amount) * 100,
        })),
      };
    })
    .filter((causeArea) => causeArea.amount > 0);

  return causeAreas;
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
