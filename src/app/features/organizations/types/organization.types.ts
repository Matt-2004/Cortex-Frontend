/**
 * Shapes of the Cortex organizations API (`/api/organizations/*`), taken
 * from the backend's OpenAPI document (Cortex.Api v1). JSON is camelCase.
 */

// ─── Roles ───────────────────────────────────────────────────────────

/**
 * The API sends a role as an integer: 1 = Owner, 2 = Admin, 3 = Member.
 * This list is the only place the mapping lives.
 */
export const ORGANIZATION_ROLES = [
  {
    value: 1,
    label: "Owner",
    description: "Full control, including members and settings.",
  },
  {
    value: 2,
    label: "Admin",
    description: "Manages members and settings.",
  },
  {
    value: 3,
    label: "Member",
    description: "Works in the organization. Cannot manage it.",
  },
] as const;

/**
 * A role inside the console: an integer, see ORGANIZATION_ROLES. The current
 * API spec sends and expects names ("Owner" | "Admin" | "Member"); `toRole`
 * reads either form and `toRoleName` writes the name.
 */
export type OrganizationRole = number;

/** `OrganizationRole` as the API spells it in request bodies. */
export type OrganizationRoleName = "Owner" | "Admin" | "Member";

export const toRoleName = (role: OrganizationRole): OrganizationRoleName => {
  const match = ORGANIZATION_ROLES.find((entry) => entry.value === role);
  if (!match) throw new Error(`Unknown organization role: ${role}`);
  return match.label;
};

/** Role offered first when adding a member: the least privileged one. */
export const DEFAULT_MEMBER_ROLE: OrganizationRole =
  ORGANIZATION_ROLES[ORGANIZATION_ROLES.length - 1].value;

export const isKnownRole = (role: OrganizationRole) =>
  ORGANIZATION_ROLES.some((entry) => entry.value === role);

/**
 * Reads a role as the API sent it. The spec says integer, but an ASP.NET API
 * with a string enum converter sends "Owner" / "admin" — accept both, so a
 * name never turns into "no permission".
 */
export function toRole(value: unknown): OrganizationRole {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string") {
    const text = value.trim();
    if (/^\d+$/.test(text)) return Number(text);
    const match = ORGANIZATION_ROLES.find(
      (entry) => entry.label.toLowerCase() === text.toLowerCase(),
    );
    if (match) return match.value;
  }
  return -1; // Unknown: shown as "Role ?" and treated as no permission.
}

export const OWNER: OrganizationRole = ORGANIZATION_ROLES[0].value;
export const ADMIN: OrganizationRole = ORGANIZATION_ROLES[1].value;
export const MEMBER: OrganizationRole = ORGANIZATION_ROLES[2].value;

/**
 * Who may do what. The backend is the authority (it answers 403); these
 * rules only decide what the console offers.
 *
 * - Owners manage everything.
 * - Admins manage admins and members, but cannot touch owners or make
 *   anyone an owner.
 * - Members manage nothing, and don't see the Organizations area.
 */
export const canManage = (role: OrganizationRole) =>
  role === OWNER || role === ADMIN;

/** Who may view subscription and billing details: Owners and Admins. */
export const canViewBilling = (role: OrganizationRole): boolean =>
  role === OWNER || role === ADMIN;

/** Who may manage billing (start checkout, open customer portal): Owners only. */
export const canManageBilling = (role: OrganizationRole): boolean =>
  role === OWNER;

/** May `actor` change the role of, or remove, someone with `target` role? */
export const canEditMember = (
  actor: OrganizationRole,
  target: OrganizationRole,
) => actor === OWNER || (actor === ADMIN && target !== OWNER);

/** The roles `actor` may give to someone. */
export const assignableRoles = (actor: OrganizationRole) =>
  ORGANIZATION_ROLES.filter(
    (entry) => actor === OWNER || (actor === ADMIN && entry.value !== OWNER),
  );

export function roleLabel(role: OrganizationRole): string {
  return (
    ORGANIZATION_ROLES.find((entry) => entry.value === role)?.label ??
    (role <= 0 ? "Unknown role" : `Role ${role}`)
  );
}

// ─── Responses (from the OpenAPI document) ───────────────────────────

/** `OrganizationDto` */
export interface Organization {
  /** uuid */
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  /** The signed-in user's role in this organization. */
  role: OrganizationRole;
  /** ISO 8601 date-time. */
  createdAt: string;
}

/** `MemberDto` */
export interface OrganizationMember {
  /** uuid */
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: OrganizationRole;
  /** ISO 8601 date-time. */
  joinedAt: string;
}

/** `InvitationDto`: a pending invitation, as owners and admins see it. */
export interface OrganizationInvitation {
  /** uuid */
  id: string;
  email: string;
  role: OrganizationRole;
  invitedByName: string;
  /** ISO 8601 date-time. */
  createdAt: string;
  /** ISO 8601 date-time. */
  expiresAt: string;
}

/** `InvitationPreviewDto`: what the invitee sees before accepting. */
export interface InvitationPreview {
  organizationName: string;
  organizationLogoUrl: string | null;
  email: string;
  role: OrganizationRole;
  invitedByName: string;
  /** ISO 8601 date-time. */
  expiresAt: string;
}

// ─── Requests (from the OpenAPI document) ────────────────────────────

export interface CreateOrganizationRequest {
  name: string;
  slug: string | null;
}

export interface UpdateOrganizationRequest {
  name: string;
  logoUrl: string | null;
}

/** `InviteMemberRequest` */
export interface InviteMemberRequest {
  email: string;
  role: OrganizationRole;
}

/** `AcceptInvitationRequest` */
export interface AcceptInvitationRequest {
  token: string;
}

export interface ChangeMemberRoleRequest {
  role: OrganizationRole;
}

/** Client-side limits. The backend is the authority; these only catch typos. */
export const ORGANIZATION_LIMITS = {
  nameMax: 100,
  slugMax: 60,
  emailMax: 254,
  logoUrlMax: 2048,
} as const;
