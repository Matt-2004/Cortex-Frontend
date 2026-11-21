import { apiRequest } from "@/app/shared/utils/API/apiClient";
import type { AuthSession } from "@/app/features/auth/types/auth-api.types";
import type { RegisterInvitedRequest } from "../types/invitation.types";

/**
 * Browser client for the invitation endpoints that are not in
 * organizationsApi (preview and accept live there). Throws `ApiError`.
 */
export const invitationsApi = {
  /**
   * 200 → AuthSession without the tokens: account created (email already
   * verified), joined the organization and signed in via HttpOnly cookies.
   * 400 field errors or unusable invitation | 409 the email can't be registered.
   */
  registerInvited: (body: RegisterInvitedRequest) =>
    apiRequest<AuthSession>("/api/auth/register-invited", { body }),
};
