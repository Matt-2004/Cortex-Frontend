import {
  proxyOrganizations,
  segment,
} from "@/app/features/organizations/server/organizationsProxy";

type Context = {
  params: Promise<{ organizationId: string; invitationId: string }>;
};

/** DELETE …/invitations/{invitationId} — revoke a pending invitation. */
export async function DELETE(request: Request, { params }: Context) {
  const { organizationId, invitationId } = await params;
  return proxyOrganizations(
    request,
    `/${segment(organizationId)}/invitations/${segment(invitationId)}`,
    "DELETE",
  );
}
