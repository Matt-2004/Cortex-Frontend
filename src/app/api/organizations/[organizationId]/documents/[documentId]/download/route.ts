import {
  proxyOrganizations,
  segment,
} from "@/app/features/organizations/server/organizationsProxy";

type Context = {
  params: Promise<{ organizationId: string; documentId: string }>;
};

/**
 * GET …/documents/{documentId}/download — { url, expiresAt }, a link to the
 * original file that works for a few minutes. Any member.
 */
export async function GET(request: Request, { params }: Context) {
  const { organizationId, documentId } = await params;
  return proxyOrganizations(
    request,
    `/${segment(organizationId)}/documents/${segment(documentId)}/download`,
    "GET",
  );
}
