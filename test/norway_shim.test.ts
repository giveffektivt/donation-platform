import { buildOrganizations, dbClient, dbRelease, DonationRecipient, mapFromNorwegianOrgId, mapToNorwegianOrgId, norwegianOrgs } from "src";
import { expect, test } from "vitest";

test("defines every database donation recipient key", async () => {
  const db = await dbClient();
  try {
    const result = await db.query("select unnest(enum_range(null::donation_recipient)) as recipient");
    expect(result.rows.map(({ recipient }) => recipient)).toEqual(Object.values(DonationRecipient));
  } finally {
    dbRelease(db);
  }
});

test("maps organization IDs and donation recipient keys in both directions", () => {
  for (const organization of norwegianOrgs) {
    expect(mapFromNorwegianOrgId(organization.id)).toBe(organization.name);
    expect(mapToNorwegianOrgId(organization.name)).toBe(organization.id);
  }
});

test("exposes recipient labels to API consumers", () => {
  const organization = buildOrganizations(norwegianOrgs).find(({ id }) => id === 22);

  expect(organization).toMatchObject({
    name: "Fødevareomstilling, der mindsker efterspørgslen på animalske produkter",
    widgetDisplayName: "Fødevareomstilling, der mindsker efterspørgslen på animalske produkter",
  });
});
