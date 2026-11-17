"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { useResource } from "@/app/features/console/hooks/useResource";
import { useToast } from "@/app/features/toast/hooks/useToast";
import { useApiErrorHandler } from "@/app/shared/hooks/useApiErrorHandler";
import { subscriptionsApi } from "../api/subscriptionsApi";
import { formatBytes, formatPlanPrice } from "../utils/planFormat";
import {
  canManageBilling,
  canViewBilling,
  type OrganizationRole,
} from "../types/organization.types";
import type {
  BillingRedirectDto,
  SubscriptionDto,
  SubscriptionStatus,
} from "../types/subscription.types";
import {
  EmptyTableRow,
  ErrorState,
  NoAccess,
  Notice,
  Panel,
  Skeleton,
  SkeletonRows,
  Spinner,
  buttonPrimary,
  buttonSecondary,
  formatDate,
  mutedText,
  rowLook,
  tableLook,
  tdLook,
  thLook,
} from "@/app/features/console/ui/consoleUi";

/* After Stripe Checkout the browser comes back before Stripe's webhook has
   reached the backend, so the subscription can still read as unpaid for a
   moment. The panel asks again a few times, then leaves it to the user. */
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 10;

/** Set by the backend on the Stripe return URL: ?checkout=success|cancelled. */
const CHECKOUT_PARAM = "checkout";

const PORTAL = "portal";

// ─── Formatting ──────────────────────────────────────────────────────

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  Pending: "Pending",
  Active: "Active",
  PastDue: "Past due",
  Cancelled: "Cancelled",
  Expired: "Expired",
};

/** One sentence on where the subscription stands, in the backend's terms. */
const statusLine = (subscription: SubscriptionDto): string | null => {
  const { status, hasPaidAccess, paidThroughUtc, currentPeriodEnd } =
    subscription;
  const until =
    hasPaidAccess && paidThroughUtc
      ? ` Access until ${formatDate(paidThroughUtc)}.`
      : "";

  switch (status) {
    case "Active":
      if (!currentPeriodEnd) return null;
      return `${subscription.cancelAtPeriodEnd ? "Ends" : "Renews"} on ${formatDate(currentPeriodEnd)}.`;
    case "PastDue":
      return `The last payment failed.${until}`;
    case "Cancelled":
      return until ? `Cancelled.${until}` : "This subscription has ended.";
    case "Expired":
      return "This subscription has ended.";
    case "Pending":
      return "Waiting for payment.";
    default:
      return null;
  }
};

// ─── Panel ───────────────────────────────────────────────────────────

/**
 * The Billing tab: the organization's plan, status and usage, and the plans
 * it can move to. Owners and admins see it; only owners get the buttons that
 * lead to Stripe. The backend enforces both (403).
 */
export const BillingPanel = ({
  organizationId,
  organizationName,
  viewerRole,
}: {
  organizationId: string;
  organizationName: string;
  viewerRole: OrganizationRole;
}) =>
  canViewBilling(viewerRole) ? (
    <Billing organizationId={organizationId} viewerRole={viewerRole} />
  ) : (
    <NoAccess
      title="Only owners and admins can see billing"
      message={`You are a member of ${organizationName}. Ask an owner or admin about its plan.`}
      backHref="/console"
      backLabel="Back to overview"
    />
  );

const Billing = ({
  organizationId,
  viewerRole,
}: {
  organizationId: string;
  viewerRole: OrganizationRole;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addToastMessage } = useToast();
  const handleApiError = useApiErrorHandler();
  const mayManage = canManageBilling(viewerRole);

  const load = useCallback(
    async (signal: AbortSignal) => {
      const [subscription, plans] = await Promise.all([
        subscriptionsApi.get(organizationId, signal),
        subscriptionsApi.plans(signal),
      ]);
      return { subscription, plans: Array.isArray(plans) ? plans : [] };
    },
    [organizationId],
  );
  const { resource, reload, retry } = useResource(load);

  // ── Coming back from Stripe ──
  // The flag is read once, when the panel mounts, then taken out of the
  // address bar: a refresh or a shared link must not replay it.
  const checkoutParam = searchParams.get(CHECKOUT_PARAM);
  const [returnedFromCheckout] = useState(checkoutParam === "success");
  const returnHandled = useRef(false);

  useEffect(() => {
    if (!checkoutParam || returnHandled.current) return;
    returnHandled.current = true;

    if (checkoutParam === "cancelled") {
      addToastMessage("info", "Checkout was cancelled. Nothing was charged.");
    }

    const rest = new URLSearchParams(searchParams.toString());
    rest.delete(CHECKOUT_PARAM);
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [checkoutParam, searchParams, pathname, router, addToastMessage]);

  // ── Waiting for the webhook ──
  const [attempts, setAttempts] = useState(0);
  const [pollFailed, setPollFailed] = useState(false);
  const [checking, setChecking] = useState(false);

  const paid =
    resource.status === "ready" && resource.data.subscription.hasPaidAccess;
  const awaitingPayment =
    returnedFromCheckout && resource.status === "ready" && !paid;
  const polling =
    awaitingPayment && !pollFailed && attempts < MAX_POLL_ATTEMPTS;

  useEffect(() => {
    if (!polling) return;
    // One timer per attempt; the next is only set once this one's request
    // has answered, so two requests never overlap.
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const loaded = await reload();
      if (cancelled) return; // Unmounted, or the plan is now active.
      if (loaded) setAttempts((count) => count + 1);
      else setPollFailed(true);
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [polling, attempts, reload]);

  const checkAgain = async () => {
    setChecking(true);
    await reload();
    setChecking(false);
  };

  // ── Going to Stripe ──
  // `busy` names the button that was pressed: "portal" or a plan code.
  const [busy, setBusy] = useState<string | null>(null);

  const redirectTo = async (
    key: string,
    request: () => Promise<BillingRedirectDto>,
  ) => {
    setBusy(key);
    try {
      const { url } = await request();
      // Stays busy: the browser is leaving for Stripe.
      window.location.assign(url);
    } catch (error) {
      handleApiError(error);
      setBusy(null);
      // The refusal usually means the subscription changed elsewhere.
      void reload();
    }
  };

  // The Back button can restore this page as it was left, buttons still busy.
  useEffect(() => {
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) setBusy(null);
    };
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);

  if (resource.status === "error") {
    const forbidden = resource.error.status === 403;
    return (
      <ErrorState
        title={
          forbidden
            ? "Only owners and admins can see billing"
            : "Billing could not be loaded"
        }
        message={resource.error.message}
        onRetry={forbidden ? undefined : retry}
      />
    );
  }

  const loading = resource.status === "loading";
  const subscription = loading ? null : resource.data.subscription;
  const plans = loading ? [] : resource.data.plans;
  const status = subscription?.status ?? null;

  // Active and past-due subscriptions are still billed: the backend refuses
  // a second checkout (409), so plan changes go through the portal. The
  // portal needs a billing account, which exists once there is a status.
  const stillBilled = status === "Active" || status === "PastDue";
  const canCheckout = mayManage && !loading && !stillBilled;
  const canOpenPortal = mayManage && status !== null;
  // The plan the organization is on now: the free one, one still billed, or
  // an ended one the backend says is paid through. Otherwise it has lapsed
  // and can be chosen again.
  const planInUse =
    status === null || stillBilled || subscription?.hasPaidAccess === true;

  return (
    <div className="flex flex-col gap-6">
      {returnedFromCheckout && paid && (
        <Notice>Payment received. Your plan is active.</Notice>
      )}
      {polling && (
        <Notice>
          <span role="status">Payment received. Activating your plan…</span>
        </Notice>
      )}
      {awaitingPayment && !polling && (
        <Notice>
          <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>
              Activating your plan is taking longer than usual. Your payment is
              safe.
            </span>
            <button
              type="button"
              onClick={checkAgain}
              disabled={checking}
              className={clsx(buttonSecondary, "h-9 px-3")}
            >
              {checking && <Spinner />}
              Check again
            </button>
          </span>
        </Notice>
      )}
      {!mayManage && (
        <Notice>Only owners can change the plan or payment details.</Notice>
      )}

      <Panel className="p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Current plan</h2>
            {subscription ? (
              <>
                <p className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="font-display text-[28px] leading-tight tracking-[-0.01em]">
                    {subscription.plan.name}
                  </span>
                  {status && <StatusBadge status={status} />}
                </p>
                {subscription.plan.priceMinor > 0 && (
                  <p className={clsx("mt-1 text-sm", mutedText)}>
                    {formatPlanPrice(subscription.plan)} / month
                  </p>
                )}
              </>
            ) : (
              <>
                <Skeleton className="mt-4 h-8 w-40" />
                <Skeleton className="mt-3 h-4 w-24" />
              </>
            )}
          </div>
          {canOpenPortal && (
            <button
              type="button"
              onClick={() =>
                redirectTo(PORTAL, () =>
                  subscriptionsApi.openPortal(organizationId),
                )
              }
              disabled={busy !== null}
              className={clsx(buttonPrimary, "shrink-0")}
            >
              {busy === PORTAL && <Spinner />}
              Manage billing
            </button>
          )}
        </div>

        {subscription && <CurrentPlanDetails subscription={subscription} />}
        {loading && <Skeleton className="mt-6 h-24 w-full" />}
      </Panel>

      <Panel className="overflow-hidden">
        <section aria-label="Plans">
          <table className={tableLook}>
            <caption className="border-b border-brand-ink/10 px-4 py-3 text-left sm:px-6">
              <span className="text-sm font-semibold text-brand-ink">
                Plans
              </span>
              <span className={clsx("ml-2 text-sm", mutedText)}>
                Billed monthly
              </span>
            </caption>
            <thead>
              <tr>
                <th scope="col" className={thLook}>
                  Plan
                </th>
                <th scope="col" className={clsx(thLook, "text-right")}>
                  Price
                </th>
                <th
                  scope="col"
                  className={clsx(thLook, "hidden text-right md:table-cell")}
                >
                  AI answers
                </th>
                <th
                  scope="col"
                  className={clsx(thLook, "hidden text-right md:table-cell")}
                >
                  Documents
                </th>
                <th
                  scope="col"
                  className={clsx(thLook, "hidden text-right md:table-cell")}
                >
                  Storage
                </th>
                <th scope="col" className={thLook}>
                  <span className="sr-only">Choose</span>
                </th>
              </tr>
            </thead>
            <tbody aria-busy={loading}>
              {loading && <SkeletonRows columns={PLAN_COLUMNS} />}
              {!loading && plans.length === 0 && (
                <EmptyTableRow
                  colSpan={PLAN_COLUMNS.length}
                  title="No plans are available right now"
                />
              )}
              {plans.map((plan) => {
                const current =
                  planInUse && plan.code === subscription?.plan.code;
                return (
                  <tr key={plan.code} className={rowLook}>
                    <th
                      scope="row"
                      className={clsx(tdLook, "text-left font-medium")}
                    >
                      {plan.name}
                      {/* The allowances, where their columns don't fit. */}
                      <span
                        className={clsx(
                          "mt-0.5 block text-xs font-normal md:hidden",
                          mutedText,
                        )}
                      >
                        {plan.aiAnswersPerPeriod.toLocaleString()} answers ·{" "}
                        {plan.maxDocuments.toLocaleString()} documents ·{" "}
                        {formatBytes(plan.maxStorageBytes)}
                      </span>
                    </th>
                    <td
                      className={clsx(
                        tdLook,
                        "text-right font-receipt text-[13px] whitespace-nowrap tabular-nums",
                      )}
                    >
                      {formatPlanPrice(plan)}
                    </td>
                    <td className={clsx(tdLook, PLAN_NUMBER_CELL)}>
                      {plan.aiAnswersPerPeriod.toLocaleString()}
                    </td>
                    <td className={clsx(tdLook, PLAN_NUMBER_CELL)}>
                      {plan.maxDocuments.toLocaleString()}
                    </td>
                    <td className={clsx(tdLook, PLAN_NUMBER_CELL)}>
                      {formatBytes(plan.maxStorageBytes)}
                    </td>
                    <td className={clsx(tdLook, "text-right")}>
                      {current ? (
                        <span
                          className={clsx(
                            "text-xs whitespace-nowrap",
                            mutedText,
                          )}
                        >
                          Current plan
                        </span>
                      ) : (
                        canCheckout &&
                        plan.priceMinor > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              redirectTo(plan.code, () =>
                                subscriptionsApi.startCheckout(organizationId, {
                                  planCode: plan.code,
                                }),
                              )
                            }
                            disabled={busy !== null}
                            aria-label={`Choose ${plan.name}`}
                            className={clsx(buttonSecondary, "h-9 px-3")}
                          >
                            {busy === plan.code && <Spinner />}
                            Choose
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </Panel>

      {mayManage && stillBilled && (
        <p className={clsx("text-sm", mutedText)}>
          To switch plan, cancel or update your card, use Manage billing.
        </p>
      )}
    </div>
  );
};

const PLAN_COLUMNS = [
  "",
  "",
  "hidden md:table-cell",
  "hidden md:table-cell",
  "hidden md:table-cell",
  "",
];

const PLAN_NUMBER_CELL =
  "hidden text-right font-receipt text-[13px] tabular-nums md:table-cell";

/** The dates and the usage of the plan the organization is on. */
const CurrentPlanDetails = ({
  subscription,
}: {
  subscription: SubscriptionDto;
}) => {
  const { plan, usage, currentPeriodStart, currentPeriodEnd } = subscription;
  const line = statusLine(subscription);

  return (
    <>
      {(line || (currentPeriodStart && currentPeriodEnd)) && (
        <dl className="mt-5 flex flex-col gap-1.5 text-sm">
          {line && (
            <div>
              <dt className="sr-only">Status</dt>
              <dd>{line}</dd>
            </div>
          )}
          {currentPeriodStart && currentPeriodEnd && (
            <div className={clsx("flex flex-wrap gap-x-2", mutedText)}>
              <dt>Billing period</dt>
              <dd className="tabular-nums">
                {formatDate(currentPeriodStart)} –{" "}
                {formatDate(currentPeriodEnd)}
              </dd>
            </div>
          )}
        </dl>
      )}

      <div className="mt-6 border-t border-dashed border-brand-ink/25 pt-5">
        <h3 className="text-sm font-semibold">Usage</h3>
        <dl className="mt-4 grid gap-5 sm:grid-cols-3 sm:gap-6">
          <UsageMeter
            label="AI answers this period"
            used={usage.aiAnswersUsed}
            limit={plan.aiAnswersPerPeriod}
            format={(value) => value.toLocaleString()}
          />
          <UsageMeter
            label="Documents"
            used={usage.documentCount}
            limit={plan.maxDocuments}
            format={(value) => value.toLocaleString()}
          />
          <UsageMeter
            label="Storage"
            used={usage.storageBytes}
            limit={plan.maxStorageBytes}
            format={formatBytes}
          />
        </dl>
      </div>
    </>
  );
};

/** "320 / 500" over a bar. A plan with no allowance (Free) says so instead. */
const UsageMeter = ({
  label,
  used,
  limit,
  format,
}: {
  label: string;
  used: number;
  limit: number;
  format: (value: number) => string;
}) => {
  const share = limit > 0 ? Math.min(used / limit, 1) : 0;
  const full = limit > 0 && used >= limit;

  return (
    <div className="min-w-0">
      <dt className={clsx("text-xs", mutedText)}>{label}</dt>
      <dd className="mt-1">
        {limit > 0 ? (
          <>
            <span className="font-receipt text-[13px] tabular-nums">
              {format(used)} / {format(limit)}
            </span>
            <span
              aria-hidden="true"
              className="mt-2 block h-1.5 overflow-hidden rounded-full bg-brand-ink/[0.07]"
            >
              <span
                className={clsx(
                  "block h-full rounded-full",
                  full ? "bg-[#D92D20]" : "bg-brand-teal",
                )}
                style={{ width: `${share * 100}%` }}
              />
            </span>
          </>
        ) : (
          <span className={clsx("text-sm", mutedText)}>
            Not included in this plan
          </span>
        )}
      </dd>
    </div>
  );
};

/** Active filled, Past due in the warning red, the rest outlined. */
const StatusBadge = ({ status }: { status: SubscriptionStatus }) => (
  <span
    className={clsx(
      "inline-flex h-6 items-center rounded-[4px] px-2 text-xs font-medium whitespace-nowrap",
      status === "Active" && "bg-primary-700 text-white",
      status === "PastDue" && "bg-[#FEF3F2] text-[#B42318]",
      status !== "Active" &&
        status !== "PastDue" &&
        "border border-brand-ink/20 text-[#4B5468]",
    )}
  >
    {STATUS_LABELS[status]}
  </span>
);
