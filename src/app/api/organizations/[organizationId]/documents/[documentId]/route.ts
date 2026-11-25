import {
  proxyOrganizations,
  segment,
} from "@/app/features/organizations/server/organizationsProxy";

type Context = {
  params: Promise<{ organizationId: string; documentId: string }>;
};

const documentPath = async ({ params }: Context) => {
  const { organizationId, documentId } = await params;
  return `/${segment(organizationId)}/documents/${segment(documentId)}`;
};

/** GET …/documents/{documentId} — one document. Any member. */
export async function GET(request: Request, context: Context) {
  return proxyOrganizations(request, await documentPath(context), "GET");
}

/** DELETE …/documents/{documentId} — also cancels an upload in progress. */
export async function DELETE(request: Request, context: Context) {
  return proxyOrganizations(request, await documentPath(context), "DELETE");
}
