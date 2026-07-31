import { buildDonationEmailDistribution, DonationRecipient } from "src";
import { expect, test } from "vitest";

test("formats Smart fordeling and operations as cause areas", () => {
  expect(
    buildDonationEmailDistribution({
      amount: 500,
      earmarks: [
        { recipient: DonationRecipient.SmartFordeling, amount: 475 },
        {
          recipient: DonationRecipient.GivEffektivtsArbejdeOgVækst,
          amount: 25,
        },
      ],
    }),
  ).toEqual([
    { name: "Smart fordeling", amount: "475 kr" },
    { name: "Giv Effektivts arbejde og vækst", amount: "25 kr" },
    { name: "Sum", amount: "500 kr" },
  ]);
});

test("formats global health Smart fordeling as its cause area", () => {
  expect(
    buildDonationEmailDistribution({
      amount: 500,
      earmarks: [
        {
          recipient: DonationRecipient.SmartFordelingGlobalSundhed,
          amount: 475,
        },
        {
          recipient: DonationRecipient.GivEffektivtsArbejdeOgVækst,
          amount: 25,
        },
      ],
    }),
  ).toEqual([
    { name: "Global sundhed", amount: "475 kr" },
    { name: "Giv Effektivts arbejde og vækst", amount: "25 kr" },
    { name: "Sum", amount: "500 kr" },
  ]);
});

test("formats custom global health recipients below their cause area", () => {
  expect(
    buildDonationEmailDistribution({
      amount: 600,
      earmarks: [
        { recipient: DonationRecipient.MyggenetModMalaria, amount: 95 },
        {
          recipient: DonationRecipient.GivEffektivtsArbejdeOgVækst,
          amount: 30,
        },
        {
          recipient: DonationRecipient.SmartFordelingGlobalSundhed,
          amount: 475,
        },
      ],
    }),
  ).toEqual([
    { name: "Global sundhed", amount: "" },
    {
      name: "↳ Smart fordeling - global sundhed",
      amount: "475 kr",
    },
    { name: "↳ Myggenet mod malaria", amount: "95 kr" },
    { name: "Giv Effektivts arbejde og vækst", amount: "30 kr" },
    { name: "Sum", amount: "600 kr" },
  ]);
});
