import { norwegianOrgs } from "src/helpers/norway-shim";

export async function GET() {
  return Response.json({
    status: 200,
    content: [
      {
        id: 1,
        name: "Global health",
        widgetDisplayName: null,
        widgetContext: null,
        shortDescription: "Global health",
        longDescription: "Global health",
        informationUrl: "https://giveffektivt.dk",
        isActive: true,
        ordering: 1,
        standardPercentageShare: 100,
        organizations: buildOrganizations(norwegianOrgs),
      },
    ],
  });
}

function buildOrganizations(
  orgs: { name: string; description: string; infoUrl: string }[],
) {
  return orgs.map((org, idx) => ({
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
}
