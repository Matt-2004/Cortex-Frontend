import {
  backendApiFetch,
  forwardCredentials,
  relay,
  withBackend,
} from "@/app/features/auth/server/backendClient";
import { segment } from "@/app/features/organizations/server/organizationsProxy";

type Context = { params: Promise<{ organizationId: string }> };

/**
 * POST /api/organizations/{organizationId}/subscription/portal — returns
 * { url } for the Stripe customer portal. Owners only.
 *
 * Calls the backend directly instead of through proxyOrganizations: that
 * helper requires a JSON body on POST, and this endpoint takes none.
 */
export async function POST(request: Request, { params }: Context) {
  const { organizationId } = await params;
  return withBackend(async () =>
    relay(
      await backendApiFetch(
        `/organizations/${segment(organizationId)}/subscription/portal`,
        { method: "POST", headers: forwardCredentials(request) },
      ),
    ),
  );
}
