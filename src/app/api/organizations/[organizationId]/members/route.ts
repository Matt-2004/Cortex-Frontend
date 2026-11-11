import {
  proxyOrganizations,
  segment,
} from "@/app/features/organizations/server/organizationsProxy";

type Context = { params: Promise<{ organizationId: string }> };

/** GET /api/organizations/{organizationId}/members */
export async function GET(request: Request, { params }: Context) {
  const { organizationId } = await params;
  return proxyOrganizations(
    request,
    `/${segment(organizationId)}/members`,
    "GET",
  );
}

/** POST /api/organizations/{organizationId}/members — body: { email, role }. */
export async function POST(request: Request, { params }: Context) {
  const { organizationId } = await params;
  return proxyOrganizations(
    request,
    `/${segment(organizationId)}/members`,
    "POST",
  );
}
