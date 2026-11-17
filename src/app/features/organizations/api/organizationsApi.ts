import { apiRequest } from "@/app/shared/utils/API/apiClient";
import {
  toRole,
  toRoleName,
  type AcceptInvitationRequest,
  type ChangeMemberRoleRequest,
  type CreateOrganizationRequest,
  type InvitationPreview,
  type InviteMemberRequest,
  type Organization,
  type OrganizationInvitation,
  type OrganizationMember,
  type UpdateOrganizationRequest,
} from "../types/organization.types";

/** Every response passes through here so `role` is always a number. */
const withRole = <T extends { role: unknown }>(item: T): T => ({
  ...item,
  role: toRole(item.role),
});
const withRoles = <T extends { role: unknown }>(items: T[]): T[] =>
  Array.isArray(items) ? items.map(withRole) : [];

/**
 * Browser client for the Cortex organizations API, via our
 * /api/organizations/* proxies. Every call needs a signed-in user: on 401 the
 * session is refreshed once and the call retried. Every method throws
 * `ApiError` on failure; pass it to useApiErrorHandler.
 *
 * Status codes: create 201, invite 201, revoke invitation 204, remove member
 * 204; 403 when the user's role does not allow the change, 404 / 409 as the
 * API documents. People join only by accepting an invitation.
 */

const base = "/api/organizations";
const one = (organizationId: string) =>
  `${base}/${encodeURIComponent(organizationId)}`;
const members = (organizationId: string) => `${one(organizationId)}/members`;
const invitations = (organizationId: string) =>
  `${one(organizationId)}/invitations`;
const member = (organizationId: string, memberUserId: string) =>
  `${members(organizationId)}/${encodeURIComponent(memberUserId)}`;

export const organizationsApi = {
  /** The organizations the signed-in user belongs to. */
  list: async (signal?: AbortSignal) =>
    withRoles(await apiRequest<Organization[]>(base, { auth: true, signal })),

  create: async (body: CreateOrganizationRequest) =>
    withRole(
      await apiRequest<Organization>(base, {
        method: "POST",
        body,
        auth: true,
      }),
    ),

  get: async (organizationId: string, signal?: AbortSignal) =>
    withRole(
      await apiRequest<Organization>(one(organizationId), {
        auth: true,
        signal,
      }),
    ),

  update: async (organizationId: string, body: UpdateOrganizationRequest) =>
    withRole(
      await apiRequest<Organization>(one(organizationId), {
        method: "PUT",
        body,
        auth: true,
      }),
    ),

  members: async (organizationId: string, signal?: AbortSignal) =>
    withRoles(
      await apiRequest<OrganizationMember[]>(members(organizationId), {
        auth: true,
        signal,
      }),
    ),

  changeMemberRole: async (
    organizationId: string,
    memberUserId: string,
    body: ChangeMemberRoleRequest,
  ) =>
    withRole(
      await apiRequest<OrganizationMember>(
        member(organizationId, memberUserId),
        { method: "PUT", body: { role: toRoleName(body.role) }, auth: true },
      ),
    ),

  removeMember: (organizationId: string, memberUserId: string) =>
    apiRequest<void>(member(organizationId, memberUserId), {
      method: "DELETE",
      auth: true,
    }),

  /** Pending invitations (owners and admins). */
  invitations: async (organizationId: string, signal?: AbortSignal) =>
    withRoles(
      await apiRequest<OrganizationInvitation[]>(invitations(organizationId), {
        auth: true,
        signal,
      }),
    ),

  /** Emails an invitation; the person joins once they accept it. */
  invite: async (organizationId: string, body: InviteMemberRequest) =>
    withRole(
      await apiRequest<OrganizationInvitation>(invitations(organizationId), {
        method: "POST",
        body: { email: body.email, role: toRoleName(body.role) },
        auth: true,
      }),
    ),

  revokeInvitation: (organizationId: string, invitationId: string) =>
    apiRequest<void>(
      `${invitations(organizationId)}/${encodeURIComponent(invitationId)}`,
      { method: "DELETE", auth: true },
    ),

  /** Public: what an invitation link offers, read from its token. */
  previewInvitation: async (token: string, signal?: AbortSignal) =>
    withRole(
      await apiRequest<InvitationPreview>(
        `/api/invitations/preview?token=${encodeURIComponent(token)}`,
        { signal },
      ),
    ),

  /** Joins the organization as the signed-in user; returns it. */
  acceptInvitation: async (body: AcceptInvitationRequest) =>
    withRole(
      await apiRequest<Organization>("/api/invitations/accept", {
        method: "POST",
        body,
        auth: true,
      }),
    ),
};
