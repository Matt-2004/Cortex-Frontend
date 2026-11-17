import {
  proxyOrganizations,
  segment,
} from "@/app/features/organizations/server/organizationsProxy";

type Context = { params: Promise<{ organizationId: string }> };

/**
 * GET /api/organizations/{organizationId}/members. People join by invitation
 * (see ../invitations), not by a POST here.
 */
export async function GET(request: Request, { params }: Context) {
  const { organizationId } = await params;
  return proxyOrganizations(
    request,
    `/${segment(organizationId)}/members`,
    "GET",
  );
}
