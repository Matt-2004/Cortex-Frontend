import {
  proxyOrganizations,
  segment,
} from "@/app/features/organizations/server/organizationsProxy";

type Context = { params: Promise<{ organizationId: string }> };

/** GET /api/organizations/{organizationId} */
export async function GET(request: Request, { params }: Context) {
  const { organizationId } = await params;
  return proxyOrganizations(request, `/${segment(organizationId)}`, "GET");
}

/** PUT /api/organizations/{organizationId} — body: { name, logoUrl }. */
export async function PUT(request: Request, { params }: Context) {
  const { organizationId } = await params;
  return proxyOrganizations(request, `/${segment(organizationId)}`, "PUT");
}
