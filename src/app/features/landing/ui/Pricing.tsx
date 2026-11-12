"use client";

import { useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Check } from "lucide-react";
import {
  Container,
  Label,
  primaryButtonLook,
  sectionShell,
  sectionTitle,
} from "./primitives";
import { Reveal } from "./Reveal";

/* PLACEHOLDER PRICING: plan names, prices and limits below are demo values
   for layout only. Replace them before this page goes public. */

type Plan = {
  name: string;
  /** Who the plan is for, in a few words. */
  blurb: string;
  /** Monthly price in USD per billing mode; null = custom. */
  price: { monthly: number; annual: number } | null;
  featured?: boolean;
  action: string;
  /** What the list adds to, e.g. "Everything in Starter, and". */
  includes: string;
  items: string[];
};

const PLANS: Plan[] = [
  {
    name: "Starter",
    blurb: "To try it on one site.",
    price: { monthly: 0, annual: 0 },
    action: "Start free",
    includes: "Includes",
    items: ["1 website", "500 answers a month", "Cited answers"],
  },
  {
    name: "Growth",
    blurb: "For a store with steady traffic.",
    price: { monthly: 49, annual: 39 },
    featured: true,
    action: "Choose Growth",
    includes: "Everything in Starter, and",
    items: [
      "3 websites",
      "10,000 answers a month",
      "Product recommendations",
      "Your logo and colour",
    ],
  },
  {
    name: "Scale",
    blurb: "For several brands or high volume.",
    price: null,
    action: "Choose Scale",
    includes: "Everything in Growth, and",
    items: ["Unlimited websites", "Unlimited answers", "Priority support"],
  },
];

type Billing = "monthly" | "annual";

const BILLING_LABELS: Record<Billing, string> = {
  monthly: "Monthly",
  annual: "Annual",
};

const outlineButton =
  "inline-flex items-center justify-center rounded-md border border-brand-ink/20 bg-white font-semibold text-brand-ink transition-colors duration-150 hover:border-brand-ink/50";

const BillingSwitch = ({
  billing,
  onChange,
}: {
  billing: Billing;
  onChange: (billing: Billing) => void;
}) => (
  <div
    role="group"
    aria-label="Billing period"
    className="inline-flex rounded-lg border border-brand-ink/15 bg-white p-1 text-sm"
  >
    {(["monthly", "annual"] as const).map((option) => (
      <button
        key={option}
        type="button"
        aria-pressed={billing === option}
        onClick={() => onChange(option)}
        className={clsx(
          "inline-flex h-9 items-center gap-2 rounded-md px-4 font-medium transition-colors duration-150",
          billing === option
            ? "bg-primary-700 text-white"
            : "text-[#4B5468] hover:text-brand-ink",
        )}
      >
        {BILLING_LABELS[option]}
        {option === "annual" && (
          <span
            className={clsx(
              "rounded-[3px] px-1.5 py-0.5 font-receipt text-[10px]",
              billing === option
                ? "bg-brand-teal text-brand-ink"
                : "bg-primary-50 text-primary-700",
            )}
          >
            20% less
          </span>
        )}
      </button>
    ))}
  </div>
);

const PlanCard = ({ plan, billing }: { plan: Plan; billing: Billing }) => (
  <article
    className={clsx(
      "relative flex flex-col rounded-xl bg-white p-6 sm:p-8",
      plan.featured
        ? "border border-brand-teal ring-1 ring-brand-teal shadow-[0_24px_48px_-32px_rgba(18,23,42,0.45)]"
        : "border border-brand-ink/15",
    )}
  >
    {plan.featured && (
      <p className="absolute -top-3 left-6 rounded-[4px] bg-brand-teal px-2 py-1 font-receipt text-[10px] tracking-[0.1em] text-brand-ink uppercase sm:left-8">
        Most popular
      </p>
    )}
    <h3 className="font-display text-[1.75rem] leading-none text-brand-ink">
      {plan.name}
    </h3>
    {/* Two lines tall where the columns are narrow, so prices stay level. */}
    <p className="mt-2 text-sm text-[#4B5468] md:max-lg:min-h-10">
      {plan.blurb}
    </p>

    <p className="mt-6 flex items-baseline gap-2 text-brand-ink">
      {plan.price ? (
        <>
          {/* Keyed by the period, so a changed price pops in. */}
          <span
            key={billing}
            className={clsx(
              "font-display text-5xl leading-none tracking-[-0.02em] tabular-nums",
              plan.price.monthly !== plan.price.annual && "landing-pop",
            )}
          >
            ${plan.price[billing]}
          </span>
          <span className="text-sm text-[#4B5468]">a month</span>
        </>
      ) : (
        <span className="font-display text-5xl leading-none tracking-[-0.02em]">
          Custom
        </span>
      )}
    </p>
    {/* Always one line tall, so the three buttons stay level. */}
    <p className="mt-2 min-h-5 font-receipt text-xs text-[#4B5468]">
      {!plan.price
        ? "Priced to your volume"
        : plan.price.monthly === 0
          ? "Free, no card needed"
          : billing === "annual"
            ? "Billed once a year"
            : "Billed every month"}
    </p>

    <Link
      href="/auth/register"
      className={clsx(
        "mt-6 h-11 w-full text-[15px]",
        plan.featured ? primaryButtonLook : outlineButton,
      )}
    >
      {plan.action}
    </Link>

    <p className="mt-8 border-t border-brand-ink/10 pt-6 text-sm font-medium text-brand-ink">
      {plan.includes}
    </p>
    <ul className="mt-4 space-y-3 text-sm text-[#4B5468]">
      {plan.items.map((item) => (
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

/**
 * Purpose: what it costs. Like the FAQ, it runs the full width instead of
 * using <Section>: three plans side by side, each a column read top to bottom
 * (name, price, button, what you get), so they compare line against line.
 */
export const Pricing = () => {
  const [billing, setBilling] = useState<Billing>("annual");

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className={`${sectionShell} bg-white`}
    >
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
          <div>
            <Label className="text-primary-700">Pricing</Label>
            <h2
              id="pricing-title"
              className={`${sectionTitle} text-4xl text-brand-ink sm:text-5xl`}
            >
              Start free, upgrade later
            </h2>
            <p className="mt-4 text-lg text-[#4B5468]">
              Every plan includes cited answers.
            </p>
          </div>
          <BillingSwitch billing={billing} onChange={setBilling} />
        </div>

        {/* The grid is the Reveal itself, so the plans rise one after another. */}
        <Reveal className="mt-12 grid gap-8 md:grid-cols-3 md:gap-5 lg:mt-14 lg:gap-6">
          {PLANS.map((plan) => (
            <PlanCard key={plan.name} plan={plan} billing={billing} />
          ))}
        </Reveal>
      </Container>
    </section>
  );
};
