import { apiRequest } from "@/app/shared/utils/API/apiClient";
import type {
  BillingRedirectDto,
  PlanDto,
  StartCheckoutRequest,
  SubscriptionDto,
} from "../types/subscription.types";

/**
 * Browser client for the Cortex plans and subscriptions API, via our
 * /api/plans and /api/organizations/{id}/subscription/* proxies. Every method
 * throws `ApiError` on failure; pass it to useApiErrorHandler.
 *
 * Checkout and the portal only return the Stripe URL; the caller sends the
 * browser there.
 */

const subscription = (organizationId: string) =>
  `/api/organizations/${encodeURIComponent(organizationId)}/subscription`;

export const subscriptionsApi = {
  /** The plan catalog, in display order. Public: no session needed. */
  plans: (signal?: AbortSignal) =>
    apiRequest<PlanDto[]>("/api/plans", { signal }),

  /** The organization's plan, status and usage. 403 for plain members. */
  get: (organizationId: string, signal?: AbortSignal) =>
    apiRequest<SubscriptionDto>(subscription(organizationId), {
      auth: true,
      signal,
    }),

  /**
   * Owners only. 200 → { url } for Stripe Checkout. 400 free plan |
   * 404 unknown plan | 409 already subscribed (use the portal instead).
   */
  startCheckout: (organizationId: string, body: StartCheckoutRequest) =>
    apiRequest<BillingRedirectDto>(`${subscription(organizationId)}/checkout`, {
      method: "POST",
      body,
      auth: true,
    }),

  /**
   * Owners only. 200 → { url } for the Stripe customer portal. 404 when the
   * organization has never checked out.
   */
  openPortal: (organizationId: string) =>
    apiRequest<BillingRedirectDto>(`${subscription(organizationId)}/portal`, {
      method: "POST",
      auth: true,
    }),
};
