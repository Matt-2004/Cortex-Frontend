import {
  proxyOrganizations,
  segment,
} from "@/app/features/organizations/server/organizationsProxy";

type Context = { params: Promise<{ organizationId: string }> };

/**
 * GET /api/organizations/{organizationId}/subscription — the current plan,
 * status and usage. Owners and admins only (the backend answers 403).
 */
export async function GET(request: Request, { params }: Context) {
  const { organizationId } = await params;
  return proxyOrganizations(
    request,
    `/${segment(organizationId)}/subscription`,
    "GET",
  );
}
