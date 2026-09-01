import { DonationRecipient } from "./types";

export const donationRecipientLabels = {
  [DonationRecipient.Medlemskab]: "Giv Effektivts medlemskab",
  [DonationRecipient.StorVelkendtEffekt]: "Stor og velkendt effekt",
  [DonationRecipient.SmartFordeling]: "Smart fordeling",
  [DonationRecipient.SmartFordelingGlobal]: "Smart fordeling",
  [DonationRecipient.SmartFordelingDyr]: "Smart fordeling",
  [DonationRecipient.Andet]: "Andet",
  [DonationRecipient.Myggenet]: "Myggenet mod malaria",
  [DonationRecipient.Malariamedicin]: "Medicin mod malaria",
  [DonationRecipient.AVitamin]: "A-vitamin mod fejlernæring",
  [DonationRecipient.Spædbørnsvacciner]: "Vacciner til spædbørn",
  [DonationRecipient.Kontantoverførsler]:
    "Kontantoverførsler til verdens fattigste",
  [DonationRecipient.Ormekur]: "Ormekur",
  [DonationRecipient.Dyrevelfærd]: "Dyrevelfærd",
  [DonationRecipient.Fødevareomstilling]: "Fødevareomstilling",
  [DonationRecipient.Drift]: "Giv Effektivts arbejde og vækst",
} satisfies Record<DonationRecipient, string>;

export const getDonationRecipientLabel = (recipient: string) =>
  donationRecipientLabels[recipient as DonationRecipient] ?? recipient;
