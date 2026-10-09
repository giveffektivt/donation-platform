import {
  buildOrganizations,
  norwegianOrganizationCatalog,
} from "src/helpers/norway-shim";

export async function GET() {
  return Response.json({
    status: 200,
    content: buildOrganizations(norwegianOrganizationCatalog),
  });
}
