/** `RegisterInvitedRequest`: create the invited account (the email comes from the invitation). */
export interface RegisterInvitedRequest {
  token: string;
  name: string;
  password: string;
}

/** Where people land after joining, whatever their role. */
export const PATH_AFTER_JOINING = "/console/organizations";

/** The invitation page for a token: the link the invitation email carries. */
export const invitationPath = (token: string) =>
  `/invitations/accept?token=${encodeURIComponent(token)}`;
