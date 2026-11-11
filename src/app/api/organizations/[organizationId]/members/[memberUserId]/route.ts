import {
  proxyOrganizations,
  segment,
} from "@/app/features/organizations/server/organizationsProxy";

type Context = {
  params: Promise<{ organizationId: string; memberUserId: string }>;
};

const memberPath = async ({ params }: Context) => {
  const { organizationId, memberUserId } = await params;
  return `/${segment(organizationId)}/members/${segment(memberUserId)}`;
};

/** PUT …/members/{memberUserId} — change a member's role. Body: { role }. */
export async function PUT(request: Request, context: Context) {
  return proxyOrganizations(request, await memberPath(context), "PUT");
}

/** DELETE …/members/{memberUserId} — remove a member. */
export async function DELETE(request: Request, context: Context) {
  return proxyOrganizations(request, await memberPath(context), "DELETE");
}
