import {
  proxyOrganizations,
  segment,
} from "@/app/features/organizations/server/organizationsProxy";

type Context = { params: Promise<{ organizationId: string }> };

/**
 * POST /api/organizations/{organizationId}/subscription/checkout — body:
 * { planCode }. Returns { url } for Stripe Checkout. Owners only.
 */
export async function POST(request: Request, { params }: Context) {
  const { organizationId } = await params;
  return proxyOrganizations(
    request,
    `/${segment(organizationId)}/subscription/checkout`,
    "POST",
  );
}
