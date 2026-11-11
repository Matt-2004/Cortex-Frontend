"use client";

import { useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Figure, Mark, Section, figureCard, textLink } from "./primitives";

/* PLACEHOLDER PRICING: plan names, prices and limits below are demo values
   for layout only. Replace them before this page goes public. */

type Plan = {
  name: string;
  /** Monthly price in USD per billing mode; null = custom. */
  price: { monthly: number; annual: number } | null;
  featured?: boolean;
  items: string[];
};

const PLANS: Plan[] = [
  {
    name: "Starter",
    price: { monthly: 0, annual: 0 },
    items: ["1 website", "500 answers a month"],
  },
  {
    name: "Growth",
    price: { monthly: 49, annual: 39 },
    featured: true,
    items: ["3 websites", "10,000 answers a month", "Recommendations"],
  },
  {
    name: "Scale",
    price: null,
    items: ["Unlimited websites", "Priority support"],
  },
];

type Billing = "monthly" | "annual";

const BILLING_LABELS: Record<Billing, string> = {
  monthly: "Monthly",
  annual: "Annual",
};

/** Purpose: what it costs. Same layout as every section; the price list takes the visual's place. */
export const Pricing = () => {
  const [billing, setBilling] = useState<Billing>("annual");

  return (
    <Section
      id="pricing"
      label="Pricing"
      title="Start free, upgrade later"
      lead="Every plan includes cited answers."
      figure={
        <Figure>
          <ul className={`${figureCard} divide-y divide-brand-ink/10 px-5`}>
            {PLANS.map((plan) => (
              <li key={plan.name} className="py-5">
                <div className="flex items-baseline gap-3">
                  <h3 className="font-display text-2xl leading-none text-brand-ink">
                    {plan.featured ? <Mark>{plan.name}</Mark> : plan.name}
                  </h3>
                  <span
                    aria-hidden="true"
                    className="flex-1 -translate-y-1 border-b border-dotted border-brand-ink/40"
                  />
                  <p className="font-receipt text-lg font-medium text-brand-ink tabular-nums">
                    {plan.price ? (
                      <>
                        ${plan.price[billing]}
                        <span className="text-xs font-normal text-[#4B5468]">
                          {" "}
                          /mo
                        </span>
                      </>
                    ) : (
                      "Custom"
                    )}
                  </p>
                </div>
                <p className="mt-2 text-sm text-[#4B5468]">
                  {plan.items.join(" · ")}
                </p>
                <Link
                  href="/auth/register"
                  className={`${textLink} mt-3 inline-block text-sm text-brand-ink`}
                >
                  Choose {plan.name} <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </Figure>
      }
    >
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
            onClick={() => setBilling(option)}
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
    </Section>
  );
};
