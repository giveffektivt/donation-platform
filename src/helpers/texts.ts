import { DonationRecipient } from "src/donation/types";

// prettier-ignore
export const donationPurpose: { [key in DonationRecipient]: string }  = {
  [DonationRecipient.GivEffektivt]: "",
  [DonationRecipient.GivEffektivtsAnbefaling]: "Giv Effektivts anbefaling (GiveWell Top Charities Fund)",
  [DonationRecipient.StørreMenVariabelEffekt]: "Større, men variabel effekt (GiveWell All Grants Fund)",
  [DonationRecipient.MyggenetModMalaria]: "Myggenet mod malaria (Against Malaria Foundation)",
  [DonationRecipient.MedicinModMalaria]: "Medicin mod malaria (Malaria Consortium)",
  [DonationRecipient.VitaminModMangelsygdomme]: "Vitamin mod mangelsygdomme (Helen Keller International)",
  [DonationRecipient.VaccinerTilSpædbørn]: "Vacciner til spædbørn (New Incentives)",
};

// prettier-ignore
export const donationPurposeDescription: { [key in DonationRecipient]: string } = {
  [DonationRecipient.GivEffektivt]: "",
  [DonationRecipient.GivEffektivtsAnbefaling]: "Din donation fordeles bedst muligt blandt humanitære organisationer, der har store og velkendte effekter.",
  [DonationRecipient.StørreMenVariabelEffekt]: "Din donation fordeles bedst muligt blandt humanitære organisationer, der potentielt har særdeles store effekter.",
  [DonationRecipient.MyggenetModMalaria]: "Myggenet beskytter familier imod malariamyg, mens de sover.",
  [DonationRecipient.MedicinModMalaria]: "Der uddeles forebyggende malariamedicin i perioder, hvor smittetallet er særligt højt.",
  [DonationRecipient.VitaminModMangelsygdomme]: "A-vitamin til børn under 5 år reducerer børnedødelighed i 21 lande.",
  [DonationRecipient.VaccinerTilSpædbørn]: "Forældre får en økonomisk belønning for at få deres børn vaccineret.",
};
