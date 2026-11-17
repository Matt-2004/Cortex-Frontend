"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Check } from "lucide-react";
import { subscriptionsApi } from "@/app/features/organizations/api/subscriptionsApi";
import type { PlanDto } from "@/app/features/organizations/types/subscription.types";
import {
  formatBytes,
  formatPlanPrice,
} from "@/app/features/organizations/utils/planFormat";
import { isAbortError } from "@/app/shared/utils/errors/apiError";
import {
  Container,
  Label,
  primaryButtonLook,
  sectionShell,
  sectionTitle,
} from "./primitives";
import { Reveal } from "./Reveal";

/* Prices and limits come from GET /api/plans, the same catalog Stripe
   Checkout bills against. Only the marketing copy lives here. */

const FEATURED_CODE = "growth";

const BLURBS: Record<string, string> = {
  free: "Set up your business and team.",
  starter: "For one store getting started.",
  growth: "For a store with steady traffic.",
};

const FREE_ITEMS = [
  "Your organization",
  "Invite your team",
  "Upgrade when you are ready",
];

const planItems = (plan: PlanDto) =>
  plan.priceMinor === 0
    ? FREE_ITEMS
    : [
        `${plan.aiAnswersPerPeriod.toLocaleString()} AI answers a month`,
        `${plan.maxDocuments.toLocaleString()} documents`,
        `${formatBytes(plan.maxStorageBytes)} of storage`,
        "Cited answers",
      ];

const outlineButton =
  "inline-flex items-center justify-center rounded-md border border-brand-ink/20 bg-white font-semibold text-brand-ink transition-colors duration-150 hover:border-brand-ink/50";

const cardLook = "relative flex flex-col rounded-xl bg-white p-6 sm:p-8";

const PlanCard = ({ plan }: { plan: PlanDto }) => {
  const free = plan.priceMinor === 0;
  const featured = plan.code === FEATURED_CODE;

  return (
    <article
      className={clsx(
        cardLook,
        featured
          ? "border border-brand-teal ring-1 ring-brand-teal shadow-[0_24px_48px_-32px_rgba(18,23,42,0.45)]"
          : "border border-brand-ink/15",
      )}
    >
      {featured && (
        <p className="absolute -top-3 left-6 rounded-[4px] bg-brand-teal px-2 py-1 font-receipt text-[10px] tracking-[0.1em] text-brand-ink uppercase sm:left-8">
          Most popular
        </p>
      )}
      <h3 className="font-display text-[1.75rem] leading-none text-brand-ink">
        {plan.name}
      </h3>
      {/* Two lines tall where the columns are narrow, so prices stay level. */}
      <p className="mt-2 text-sm text-[#4B5468] md:max-lg:min-h-10">
        {BLURBS[plan.code] ?? ""}
      </p>

      <p className="mt-6 flex items-baseline gap-2 text-brand-ink">
        <span className="font-display text-5xl leading-none tracking-[-0.02em] tabular-nums">
          {formatPlanPrice(plan)}
        </span>
        {!free && <span className="text-sm text-[#4B5468]">a month</span>}
      </p>
      {/* Always one line tall, so the buttons stay level. */}
      <p className="mt-2 min-h-5 font-receipt text-xs text-[#4B5468]">
        {free ? "No card needed" : "Billed every month"}
      </p>

      <Link
        href="/auth/register"
        className={clsx(
          "mt-6 h-11 w-full text-[15px]",
          featured ? primaryButtonLook : outlineButton,
        )}
      >
        {free ? "Start free" : `Choose ${plan.name}`}
      </Link>

      <p className="mt-8 border-t border-brand-ink/10 pt-6 text-sm font-medium text-brand-ink">
        Includes
      </p>
      <ul className="mt-4 space-y-3 text-sm text-[#4B5468]">
        {planItems(plan).map((item) => (
          <li key={item} className="flex gap-3">
            <Check
              aria-hidden="true"
              strokeWidth={2.5}
              className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal"
            />
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
};

/** Holds the card's height while the catalog loads, so the page doesn't jump. */
const PlanCardSkeleton = () => (
  <div
    aria-hidden="true"
    className={clsx(cardLook, "min-h-[30rem] border border-brand-ink/15")}
  >
    <span className="block h-7 w-28 rounded bg-brand-ink/[0.07]" />
    <span className="mt-3 block h-4 w-44 rounded bg-brand-ink/[0.07]" />
    <span className="mt-6 block h-12 w-36 rounded bg-brand-ink/[0.07]" />
    <span className="mt-8 block h-11 w-full rounded-md bg-brand-ink/[0.07]" />
  </div>
);

type Catalog =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; plans: PlanDto[] };

/**
 * Purpose: what it costs. Like the FAQ, it runs the full width instead of
 * using <Section>: the plans side by side, each a column read top to bottom
 * (name, price, button, what you get), so they compare line against line.
 */
export const Pricing = () => {
  const [catalog, setCatalog] = useState<Catalog>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    subscriptionsApi
      .plans(controller.signal)
      .then((plans) =>
        setCatalog({
          status: "ready",
          plans: Array.isArray(plans) ? plans : [],
        }),
      )
      .catch((error) => {
        if (!isAbortError(error)) setCatalog({ status: "error" });
      });
    return () => controller.abort();
  }, []);

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className={`${sectionShell} bg-white`}
    >
      <Container>
        <div>
          <Label className="text-primary-700">Pricing</Label>
          <h2
            id="pricing-title"
            className={`${sectionTitle} text-4xl text-brand-ink sm:text-5xl`}
          >
            Start free, upgrade later
          </h2>
          <p className="mt-4 text-lg text-[#4B5468]">
            Monthly plans. Change or cancel any time.
          </p>
        </div>

        {catalog.status === "error" ||
        (catalog.status === "ready" && catalog.plans.length === 0) ? (
          <p className="mt-12 text-[#4B5468] lg:mt-14">
            Plans could not be loaded right now. Please try again later.
          </p>
        ) : (
          <Reveal className="mt-12 grid gap-8 md:grid-cols-3 md:gap-5 lg:mt-14 lg:gap-6">
            {catalog.status === "loading"
              ? [0, 1, 2].map((index) => <PlanCardSkeleton key={index} />)
              : catalog.plans.map((plan) => (
                  <PlanCard key={plan.code} plan={plan} />
                ))}
          </Reveal>
        )}
      </Container>
    </section>
  );
};
