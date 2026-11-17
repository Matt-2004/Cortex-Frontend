/**
 * Shapes of the Cortex subscriptions & plans API, matching backend C# DTOs
 * in Cortex.Application.Subscriptions.Dtos and Cortex.Domain.Enums.SubscriptionStatus.
 *
 * All properties are camelCase matching ASP.NET Core JSON serialization.
 */

export type SubscriptionStatus =
  | "Pending"
  | "Active"
  | "PastDue"
  | "Cancelled"
  | "Expired";

/** `PlanDto` from GET /api/plans and SubscriptionDto.Plan */
export interface PlanDto {
  code: string;
  name: string;
  /** Price in satang (100 satang = ฿1). 0 for Free plan. */
  priceMinor: number;
  currency: string;
  aiAnswersPerPeriod: number;
  maxDocuments: number;
  maxStorageBytes: number;
}

/** `UsageDto` from SubscriptionDto.Usage */
export interface UsageDto {
  aiAnswersUsed: number;
  documentCount: number;
  storageBytes: number;
}

/** `SubscriptionDto` from GET /api/organizations/{organizationId}/subscription */
export interface SubscriptionDto {
  plan: PlanDto;
  /** Null for an organization that has never subscribed (free tier). */
  status: SubscriptionStatus | null;
  /**
   * Whether the organization currently has paid access.
   * True for Active subscriptions, or Cancelled/PastDue within paidThroughUtc.
   */
  hasPaidAccess: boolean;
  /** ISO 8601 UTC date string or null */
  currentPeriodStart: string | null;
  /** ISO 8601 UTC date string or null */
  currentPeriodEnd: string | null;
  /** ISO 8601 UTC date string or null */
  paidThroughUtc: string | null;
  cancelAtPeriodEnd: boolean;
  usage: UsageDto;
}

/** `StartCheckoutRequest` for POST /api/organizations/{organizationId}/subscription/checkout */
export interface StartCheckoutRequest {
  planCode: string;
}

/** `BillingRedirectDto` returned by checkout and portal endpoints */
export interface BillingRedirectDto {
  url: string;
}
