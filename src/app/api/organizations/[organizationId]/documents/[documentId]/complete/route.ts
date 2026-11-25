import {
  backendApiFetch,
  forwardCredentials,
  relay,
  withBackend,
} from "@/app/features/auth/server/backendClient";
import { segment } from "@/app/features/organizations/server/organizationsProxy";

type Context = {
  params: Promise<{ organizationId: string; documentId: string }>;
};

/**
 * POST …/documents/{documentId}/complete — confirms that the file reached
 * storage. Owners and admins.
 *
 * Calls the backend directly instead of through proxyOrganizations: that
 * helper requires a JSON body on POST, and this endpoint takes none.
 */
export async function POST(request: Request, { params }: Context) {
  const { organizationId, documentId } = await params;
  return withBackend(async () =>
    relay(
      await backendApiFetch(
        `/organizations/${segment(organizationId)}/documents/${segment(documentId)}/complete`,
        { method: "POST", headers: forwardCredentials(request) },
      ),
    ),
  );
}
