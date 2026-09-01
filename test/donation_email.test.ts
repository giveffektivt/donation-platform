import { buildDonationEmailDistribution, DonationRecipient } from "src";
import { expect, test } from "vitest";

test("formats Smart fordeling and operations as cause areas", () => {
  expect(
    buildDonationEmailDistribution({
      amount: 500,
      earmarks: [
        { recipient: DonationRecipient.SmartFordeling, amount: 475 },
        {
          recipient: DonationRecipient.Drift,
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

test("formats global health and poverty Smart fordeling as its cause area", () => {
  expect(
    buildDonationEmailDistribution({
      amount: 500,
      earmarks: [
        {
          recipient: DonationRecipient.SmartFordelingGlobal,
          amount: 475,
        },
        {
          recipient: DonationRecipient.Drift,
          amount: 25,
        },
      ],
    }),
  ).toEqual([
    { name: "Global sundhed og fattigdom", amount: "475 kr" },
    { name: "Giv Effektivts arbejde og vækst", amount: "25 kr" },
    { name: "Sum", amount: "500 kr" },
  ]);
});

test("formats custom global health and poverty recipients below their cause area", () => {
  expect(
    buildDonationEmailDistribution({
      amount: 600,
      earmarks: [
        { recipient: DonationRecipient.Myggenet, amount: 95 },
        {
          recipient: DonationRecipient.Drift,
          amount: 30,
        },
        {
          recipient: DonationRecipient.SmartFordelingGlobal,
          amount: 475,
        },
      ],
    }),
  ).toEqual([
    { name: "Global sundhed og fattigdom", amount: "" },
    {
      name: "↳ Smart fordeling - global sundhed og fattigdom",
      amount: "475 kr",
    },
    { name: "↳ Myggenet mod malaria", amount: "95 kr" },
    { name: "Giv Effektivts arbejde og vækst", amount: "30 kr" },
    { name: "Sum", amount: "600 kr" },
  ]);
});

test("formats animal welfare and food transition recipients", () => {
  expect(
    buildDonationEmailDistribution({
      amount: 500,
      earmarks: [
        {
          recipient: DonationRecipient.SmartFordelingDyr,
          amount: 300,
        },
        {
          recipient: DonationRecipient.Fødevareomstilling,
          amount: 200,
        },
      ],
    }),
  ).toEqual([
    { name: "Dyrevelfærd og fødevareomstilling", amount: "" },
    {
      name: "↳ Smart fordeling - dyrevelfærd og fødevareomstilling",
      amount: "300 kr",
    },
    {
      name: "↳ Fødevareomstilling, der mindsker efterspørgslen på animalske produkter",
      amount: "200 kr",
    },
    { name: "Sum", amount: "500 kr" },
  ]);
});
