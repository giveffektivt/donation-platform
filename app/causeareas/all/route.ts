import {
  buildOrganizations,
  norwegianCauseAreas,
  norwegianOrgs,
} from "src/helpers/norway-shim";

export async function GET() {
  return Response.json({
    status: 200,
    content: norwegianCauseAreas.map((causeArea, idx) => ({
      id: causeArea.id,
      name: causeArea.name,
      widgetDisplayName: null,
      widgetContext: null,
      shortDescription: causeArea.description,
      longDescription: causeArea.description,
      informationUrl: "https://giveffektivt.dk",
      isActive: causeArea.isActive,
      ordering: idx + 1,
      standardPercentageShare: causeArea.standardPercentageShare,
      organizations: buildOrganizations(
        norwegianOrgs.filter((org) => org.causeAreaId === causeArea.id),
      ),
    })),
  });
}
