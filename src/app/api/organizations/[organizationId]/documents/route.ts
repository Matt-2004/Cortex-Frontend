import {
  proxyOrganizations,
  segment,
} from "@/app/features/organizations/server/organizationsProxy";

type Context = { params: Promise<{ organizationId: string }> };

const documentsPath = async ({ params }: Context) =>
  `/${segment((await params).organizationId)}/documents`;

/** GET /api/organizations/{organizationId}/documents — newest first. Any member. */
export async function GET(request: Request, context: Context) {
  return proxyOrganizations(request, await documentsPath(context), "GET");
}

/**
 * POST /api/organizations/{organizationId}/documents — starts an upload.
 * Body: { fileName, contentType, sizeBytes }. 201 → an upload session.
 */
export async function POST(request: Request, context: Context) {
  return proxyOrganizations(request, await documentsPath(context), "POST");
}
