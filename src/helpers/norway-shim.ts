import { getDonationRecipientLabel } from "src/donation/recipients";
import { DonationRecipient, PaymentMethod } from "src/donation/types";

type NorwegianOrg = {
  id: number;
  name: DonationRecipient;
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
    name: DonationRecipient.SmartFordelingGlobal,
    widgetDisplayName: DonationRecipient.SmartFordeling,
    description:
      "Din donation fordeles efter Giv Effektivts anbefalinger for at skabe den størst mulige effekt inden for global sundhed og fattigdom.",
    infoUrl: "/smart-fordeling",
    causeAreaId: 1,
  },
  {
    id: 2,
    name: DonationRecipient.Myggenet,
    description: "Myggenet beskytter familier imod malariamyg, mens de sover.",
    infoUrl: "/myggenet",
    causeAreaId: 1,
  },
  {
    id: 3,
    name: DonationRecipient.Malariamedicin,
    description:
      "Der uddeles forebyggende malariamedicin i perioder, hvor smittetallet er særligt højt.",
    infoUrl: "/malariamedicin",
    causeAreaId: 1,
  },
  {
    id: 4,
    name: DonationRecipient.AVitamin,
    description:
      "A-vitamin til børn under 5 år reducerer børnedødelighed i 21 lande.",
    infoUrl: "/a-vitamin",
    causeAreaId: 1,
  },
  {
    id: 5,
    name: DonationRecipient.Spædbørnsvacciner,
    description:
      "Forældre får en økonomisk belønning for at få deres børn vaccineret.",
    infoUrl: "/bornevacciner",
    causeAreaId: 1,
  },
  {
    id: 6,
    name: DonationRecipient.Kontantoverførsler,
    description:
      "Kontantoverførsler gives direkte til fattige familier, så de selv kan prioritere deres behov.",
    infoUrl: "/kontantoverforsler",
    causeAreaId: 1,
  },
  {
    id: 98,
    name: DonationRecipient.Ormekur,
    description:
      "Ormekure til skolebørn forbedrer sundhed og øger skolegang og fremtidig indkomst.",
    infoUrl: "/",
    causeAreaId: 1,
    isActive: false,
  },
  {
    id: 20,
    name: DonationRecipient.SmartFordelingDyr,
    widgetDisplayName: DonationRecipient.SmartFordeling,
    description:
      "Din donation fordeles efter Giv Effektivts anbefalinger for at skabe den størst mulige effekt inden for dyrevelfærd og fødevareomstilling.",
    infoUrl: "/smart-fordeling",
    causeAreaId: 2,
  },
  {
    id: 21,
    name: DonationRecipient.Dyrevelfærd,
    description: "Dyrevelfærd, der forbedrer vilkårene i kødindustrien.",
    infoUrl: "/dyrevelfaerd-og-fodevareomstilling",
    causeAreaId: 2,
  },
  {
    id: 22,
    name: DonationRecipient.Fødevareomstilling,
    description:
      "Fødevareomstilling, der mindsker efterspørgslen på animalske produkter.",
    infoUrl: "/dyrevelfaerd-og-fodevareomstilling",
    causeAreaId: 2,
  },
  {
    id: 40,
    name: DonationRecipient.Drift,
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
    name: DonationRecipient.Medlemskab,
    description: getDonationRecipientLabel(DonationRecipient.Medlemskab),
    infoUrl: "/",
    causeAreaId: 99,
    isActive: false,
  },
];

type ImpactOnlyOrg = Omit<NorwegianOrg, "name" | "isActive"> & {
  name: string;
  isActive: false;
};

export const norwegianImpactOrgs: ImpactOnlyOrg[] = [
  {
    id: 100,
    name: "TaRL Africa",
    description:
      "Målrettet undervisning tilpasset børns færdigheder i læsning og matematik.",
    infoUrl: "https://www.tarlafrica.org/",
    causeAreaId: 1,
    isActive: false,
  },
  {
    id: 101,
    name: "Evidence Action",
    description:
      "Programmer for blandt andet ormekur, jerntilskud og adgang til rent vand.",
    infoUrl: "https://www.evidenceaction.org/",
    causeAreaId: 1,
    isActive: false,
  },
  {
    id: 102,
    name: "Taimaka",
    description: "Behandling af akut underernæring hos børn.",
    infoUrl: "https://taimaka.org/",
    causeAreaId: 1,
    isActive: false,
  },
  {
    id: 103,
    name: "Lafiya",
    description: "Adgang til prævention og familieplanlægning.",
    infoUrl: "https://www.lafiya.org/",
    causeAreaId: 1,
    isActive: false,
  },
];

export const norwegianOrganizationCatalog = [
  ...norwegianOrgs,
  ...norwegianImpactOrgs,
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
    name: "Global sundhed og fattigdom",
    description: "Global sundhed og fattigdom",
    standardPercentageShare: 0,
    standardOrganizationId: 1,
    isActive: true,
  },
  {
    id: 2,
    name: "Dyrevelfærd og fødevareomstilling",
    description: "Dyrevelfærd og fødevareomstilling",
    standardPercentageShare: 0,
    standardOrganizationId: 20,
    isActive: true,
  },
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
    name: getDonationRecipientLabel(DonationRecipient.Medlemskab),
    description: getDonationRecipientLabel(DonationRecipient.Medlemskab),
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
  return org.name;
};

export const mapToNorwegianOrgId = (recipient: string): number => {
  if (recipient === DonationRecipient.StorVelkendtEffekt) {
    return 1;
  }
  const org = norwegianOrgs.find((candidate) => candidate.name === recipient);
  if (org) {
    return org.id;
  }
  throw new Error(`Unknown organization ${recipient}`);
};

export const getDonationRecipientPath = (recipient: string): string => {
  const label = getDonationRecipientLabel(recipient);
  const org = norwegianOrgs.find(
    (candidate) =>
      candidate.name === recipient ||
      (recipient === DonationRecipient.StorVelkendtEffekt &&
        candidate.id === 1),
  );
  const causeArea = norwegianCauseAreas.find(
    (candidate) => candidate.id === org?.causeAreaId,
  );

  return causeArea && causeArea.name !== label
    ? `${causeArea.name} > ${label}`
    : label;
};

export const buildNorwegianCauseAreaDistribution = (
  earmarks: { recipient: string; amount: number }[],
  donationAmount: number,
) => {
  const causeAreas = norwegianCauseAreas
    .map((causeArea) => {
      const causeAreaEarmarks = earmarks
        .filter((earmark) => {
          const orgId = mapToNorwegianOrgId(earmark.recipient);
          return (
            norwegianOrgs.find((org) => org.id === orgId)?.causeAreaId ===
            causeArea.id
          );
        })
        .sort(
          (a, b) =>
            mapToNorwegianOrgId(a.recipient) - mapToNorwegianOrgId(b.recipient),
        );
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
          name: getDonationRecipientLabel(earmark.recipient),
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

export const buildOrganizations = (orgs: (NorwegianOrg | ImpactOnlyOrg)[]) =>
  orgs.map((org, idx) => ({
    id: org.id,
    name: getDonationRecipientLabel(org.name),
    widgetDisplayName: getDonationRecipientLabel(
      org.widgetDisplayName ?? org.name,
    ),
    widgetContext: null,
    shortDescription: org.description,
    longDescription: getDonationRecipientLabel(org.name),
    standardShare: idx === 0 ? 100 : 0,
    informationUrl: org.infoUrl,
    isActive: org.isActive ?? true,
    ordering: idx + 1,
    causeAreaId: org.causeAreaId,
  }));
