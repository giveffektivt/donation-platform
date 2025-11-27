import { buildOrganizations, norwegianOrgs } from "src/helpers/norway-shim";

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
