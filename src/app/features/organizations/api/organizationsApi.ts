import { apiRequest } from "@/app/shared/utils/API/apiClient";
import {
  toRole,
  type AddMemberRequest,
  type ChangeMemberRoleRequest,
  type CreateOrganizationRequest,
  type Organization,
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
 * Status codes: create 201, add member 201, remove member 204, delete 204; 403 when the
 * user's role does not allow the change, 404 / 409 as the API documents.
 */

const base = "/api/organizations";
const one = (organizationId: string) =>
  `${base}/${encodeURIComponent(organizationId)}`;
const members = (organizationId: string) => `${one(organizationId)}/members`;
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

  update: (organizationId: string, body: UpdateOrganizationRequest) =>
    apiRequest<Organization>(one(organizationId), {
      method: "PUT",
      body,
      auth: true,
    }),

  /** Owners only. Removes the organization and every membership in it. */
  remove: (organizationId: string) =>
    apiRequest<void>(one(organizationId), { method: "DELETE", auth: true }),

  members: async (organizationId: string, signal?: AbortSignal) =>
    withRoles(
      await apiRequest<OrganizationMember[]>(members(organizationId), {
        auth: true,
        signal,
      }),
    ),

  /** Adds an existing Cortex user, found by email. */
  addMember: (organizationId: string, body: AddMemberRequest) =>
    apiRequest<OrganizationMember>(members(organizationId), {
      method: "POST",
      body,
      auth: true,
    }),

  changeMemberRole: (
    organizationId: string,
    memberUserId: string,
    body: ChangeMemberRoleRequest,
  ) =>
    apiRequest<OrganizationMember>(member(organizationId, memberUserId), {
      method: "PUT",
      body,
      auth: true,
    }),

  removeMember: (organizationId: string, memberUserId: string) =>
    apiRequest<void>(member(organizationId, memberUserId), {
      method: "DELETE",
      auth: true,
    }),
};
