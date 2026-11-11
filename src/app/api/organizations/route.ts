import { proxyOrganizations } from "@/app/features/organizations/server/organizationsProxy";

/** GET /api/organizations — the organizations the signed-in user belongs to. */
export async function GET(request: Request) {
  return proxyOrganizations(request, "", "GET");
}

/** POST /api/organizations — create one. Body: { name, slug }. */
export async function POST(request: Request) {
  return proxyOrganizations(request, "", "POST");
}
