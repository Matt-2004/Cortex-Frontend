import {
  proxyOrganizations,
  segment,
} from "@/app/features/organizations/server/organizationsProxy";

type Context = { params: Promise<{ organizationId: string }> };

const invitationsPath = async ({ params }: Context) =>
  `/${segment((await params).organizationId)}/invitations`;

/** GET /api/organizations/{organizationId}/invitations — pending ones. */
export async function GET(request: Request, context: Context) {
  return proxyOrganizations(request, await invitationsPath(context), "GET");
}

/** POST /api/organizations/{organizationId}/invitations — body: { email, role }. */
export async function POST(request: Request, context: Context) {
  return proxyOrganizations(request, await invitationsPath(context), "POST");
}
