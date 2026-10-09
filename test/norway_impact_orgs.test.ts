import { GET as getCauseAreas } from "../app/causeareas/all/route";
import { GET as getOrganizations } from "../app/organizations/all/route";
import {
  buildOrganizations,
  DonationRecipient,
  mapFromNorwegianOrgId,
  mapToNorwegianOrgId,
  norwegianImpactOrgs,
  norwegianOrganizationCatalog,
  norwegianOrgs,
} from "src";
import { expect, test } from "vitest";

const recipients = ["TaRL Africa", "Evidence Action", "Taimaka", "Lafiya"];

test("Custom transfer recipients are exposed as inactive impact metadata", async () => {
  const { content } = await (await getOrganizations()).json();
  expect(norwegianImpactOrgs.map((org) => org.name)).toEqual(recipients);
  for (const recipient of recipients) {
    expect(content.find((org: { name: string }) => org.name === recipient)).toMatchObject({
      name: recipient,
      isActive: false,
      causeAreaId: 1,
      standardShare: 0,
    });
  }
});

test("The cause area endpoint includes the same inactive impact organizations", async () => {
  const { content } = await (await getCauseAreas()).json();
  const organizations = content.find((causeArea: { id: number }) => causeArea.id === 1).organizations;
  for (const org of norwegianImpactOrgs) {
    expect(organizations.find((candidate: { id: number }) => candidate.id === org.id)).toMatchObject({
      name: org.name,
      isActive: false,
      causeAreaId: 1,
      standardShare: 0,
    });
  }
});

test("Impact metadata cannot be mapped to donation earmarks", () => {
  for (const org of norwegianImpactOrgs) {
    expect(() => mapFromNorwegianOrgId(org.id)).toThrow("Unknown organization id");
    expect(() => mapToNorwegianOrgId(org.name)).toThrow("Unknown organization");
  }
  expect(mapFromNorwegianOrgId(50)).toBe(DonationRecipient.Andet);
  expect(mapToNorwegianOrgId(DonationRecipient.Andet)).toBe(50);
});

test("Adding impact metadata preserves all selectable organizations and unique IDs", () => {
  const catalog = buildOrganizations(norwegianOrganizationCatalog);
  expect(catalog.filter((org) => org.isActive)).toEqual(buildOrganizations(norwegianOrgs).filter((org) => org.isActive));
  expect(new Set(catalog.map((org) => org.id)).size).toBe(catalog.length);
  for (const recipient of recipients) {
    expect(catalog.filter((org) => org.name === recipient)).toHaveLength(1);
  }
});
