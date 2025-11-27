import { buildOrganizations, norwegianOrgs } from "src/helpers/norway-shim";

export async function GET() {
  return Response.json({
    status: 200,
    content: buildOrganizations(norwegianOrgs),
  });
}
