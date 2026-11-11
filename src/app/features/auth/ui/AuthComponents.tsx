"use client";

import { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { clsx } from "clsx";
import { Check, X } from "lucide-react";
import {
  Cite,
  Container,
  Label,
  figureCard,
  sectionTitle,
} from "@/app/features/landing/ui/primitives";
import { passwordRules } from "../utils/typeSchema";
import {
  AuthNavDirection,
  AuthPanelEnter,
  rememberAuthNavDirection,
} from "./AuthPanelEnter";

/* ────────────────────────────────────────────────────────────
 * Shared building blocks for every /auth screen.
 * All screens use <AuthSplitLayout> so they match /auth/login.
 *
 * The look follows the landing page (/) on a white background: the same
 * header bar, serif headings, mono labels and the teal primary button.
 * The fonts come from src/app/auth/layout.tsx.
 * ──────────────────────────────────────────────────────────── */

/** id of the page <h1>; forms use it as their accessible name. */
export const AUTH_TITLE_ID = "auth-title";

export const AuthPageContainer = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-white text-brand-ink">
      {/* Same bar as the landing page, so the brand sits in the same place */}
      <header className="border-b border-brand-ink/10 bg-white">
        <Container className="flex h-16 items-center justify-between gap-4">
          <AuthBrand />
          <Link
            href="/"
            className="text-sm font-medium text-[#4B5468] underline decoration-current/30 decoration-1 underline-offset-4 transition-colors hover:text-brand-ink"
          >
            Back to home
          </Link>
        </Container>
      </header>

      <main className="flex flex-1 items-start py-8 sm:items-center sm:py-12 lg:py-16">
        {children}
      </main>
    </div>
  );
};

/** Cortex mark + wordmark. The wordmark is "Cortex" only. */
export const AuthBrand = () => (
  <Link
    href="/"
    aria-label="Cortex home"
    className="inline-flex items-center gap-2.5 rounded-sm"
  >
    <Image
      src="/brand/cortex-cx-mark.svg"
      alt=""
      width={26}
      height={26}
      priority
    />
    <span className="text-[17px] font-semibold tracking-[-0.02em] text-brand-ink">
      Cortex
    </span>
  </Link>
);

type AuthSplitLayoutProps = {
  /** Small uppercase label on the brand panel. */
  eyebrow: string;
  /** Headline on the brand panel. */
  headline: string;
  /** Form-side heading. */
  title: string;
  /** Form-side sub-heading. */
  subtitle?: ReactNode;
  children: ReactNode;
};

export const AuthSplitLayout = ({
  eyebrow,
  headline,
  title,
  subtitle,
  children,
}: AuthSplitLayoutProps) => {
  return (
    <AuthPageContainer>
      {/* Same grid as a landing section: text left, the form in the visual's place. */}
      <Container className="grid items-center gap-10 lg:grid-cols-12 lg:gap-x-8">
        {/* ── About panel (desktop only) ── */}
        <aside
          aria-label="About Cortex"
          className="hidden lg:col-span-5 lg:block"
        >
          <Label className="text-primary-700">{eyebrow}</Label>
          {/* Not a heading: the form's <h1> is the page's only heading. */}
          <p
            className={`${sectionTitle} text-4xl text-brand-ink xl:text-[2.75rem]`}
          >
            {headline}
          </p>

          {/* A cited answer, as on the landing page (decorative) */}
          <div
            aria-hidden="true"
            className={`${figureCard} mt-10 flex max-w-[380px] flex-col gap-2.5 p-4 text-sm leading-relaxed`}
          >
            <p className="max-w-[85%] self-end rounded-md rounded-br-none bg-primary-700 px-3 py-2 text-white">
              What’s your return window?
            </p>
            <p className="self-start rounded-md rounded-bl-none bg-brand-mist px-3 py-2 text-brand-ink">
              You have 30 days from delivery
              <Cite n={1} />.
            </p>
            <p className="font-receipt text-[11px] text-[#4B5468]">
              1 · Returns policy.pdf, page 2
            </p>
          </div>
        </aside>

        {/* ── Form panel ── */}
        <div className="mx-auto w-full max-w-[520px] lg:col-span-6 lg:col-start-7 lg:max-w-none">
          <div className="overflow-hidden rounded-xl border border-brand-ink/10 bg-white p-6 shadow-[0_24px_48px_-36px_rgba(18,23,42,0.5)] sm:p-10">
            {/* Slides in when arriving from another auth page via AuthLink. */}
            <AuthPanelEnter>
              <div className="mb-7">
                <AuthPageCaption id={AUTH_TITLE_ID}>{title}</AuthPageCaption>
                {subtitle ? (
                  <div
                    id={`${AUTH_TITLE_ID}-description`}
                    className="mt-2 text-[15px] leading-relaxed text-[#4B5468]"
                  >
                    {subtitle}
                  </div>
                ) : null}
              </div>

              {children}
            </AuthPanelEnter>
          </div>
        </div>
      </Container>
    </AuthPageContainer>
  );
};

export const AuthPageCaption = ({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}) => {
  return (
    <h1
      id={id}
      className="font-display text-[2rem] leading-[1.1] font-normal tracking-[-0.02em] text-brand-ink sm:text-4xl"
    >
      {children}
    </h1>
  );
};

/** Light-theme overrides for the shared <Input> inside auth forms. */
export const authFormClassName = clsx(
  "flex w-full flex-col gap-5",
  "[&_label]:!text-[#4B5468] [&_label]:!font-medium",
  "[&_input]:!rounded-md [&_input]:bg-white! [&_input]:!py-2.5 [&_input]:!text-brand-ink",
  "[&_input]:!border-brand-ink/20 [&_input]:!placeholder-[#69728A]",
  "[&_input:focus]:!border-primary-700 [&_input:focus]:!outline-none [&_input:focus]:!ring-0",
  "[&_input:focus]:!shadow-[0_0_0_3px_rgba(0,171,143,0.22)]",
  "[&_input~button_svg]:!text-[#69728A] [&_input~button:hover_svg]:!text-brand-ink",
  // Error state (set by <Input> via data-invalid / aria-invalid)
  "[&_[data-invalid]>label]:!text-[#B42318]",
  "[&_input[aria-invalid=true]]:!border-[#D92D20]",
  "[&_input[aria-invalid=true]:focus]:!shadow-[0_0_0_3px_rgba(217,45,32,0.18)]",
  "[&_[data-slot=error]]:!text-[#B42318]",
);

/** Primary action: teal with navy text, the same button as the landing page. */
export const authPrimaryButtonClassName =
  // Indeterminate sweep while loading (see .auth-btn in globals.css)
  "auth-btn relative h-12 overflow-hidden !rounded-md !bg-brand-teal !text-[15px] !font-semibold !text-brand-ink !shadow-none !transition-colors !duration-150 hover:!bg-primary-400 active:!bg-primary-500 disabled:!opacity-60";

export const authCheckboxClassName =
  "h-4 w-4 rounded-sm border-brand-ink/30 bg-white accent-primary-700 focus:ring-brand-teal focus:ring-offset-0";

export const AuthLink = ({
  href,
  children,
  direction,
}: {
  href: string;
  children: ReactNode;
  /**
   * Page-slide direction for auth-to-auth links: "forward" goes deeper
   * (register, forgot password), "back" returns toward sign-in.
   */
  direction?: AuthNavDirection;
}) => (
  <Link
    href={href}
    onClick={direction ? () => rememberAuthNavDirection(direction) : undefined}
    className="font-medium text-primary-700 underline decoration-current/30 decoration-1 underline-offset-4 transition-colors hover:text-primary-800 hover:decoration-current"
  >
    {children}
  </Link>
);

export const AuthFooterText = ({ children }: { children: ReactNode }) => (
  <p className="mt-2 text-center text-sm text-[#4B5468]">{children}</p>
);

export const AuthDivider = ({ label = "or" }: { label?: string }) => (
  <div className="relative my-1 flex items-center">
    <div aria-hidden="true" className="grow border-t border-brand-ink/10" />
    <span className="mx-3 font-receipt text-[11px] tracking-[0.1em] text-[#4B5468] uppercase">
      {label}
    </span>
    <div aria-hidden="true" className="grow border-t border-brand-ink/10" />
  </div>
);

/** Inline status/error banner shown above a form. */
export const AuthAlert = ({
  tone = "error",
  title,
  children,
}: {
  tone?: "error" | "info";
  title: string;
  children?: ReactNode;
}) => (
  <div
    role={tone === "error" ? "alert" : "status"}
    className={clsx(
      "rounded-md border px-4 py-3 text-sm",
      tone === "error"
        ? "border-[#D92D20]/30 bg-[#FEF3F2] text-[#912018]"
        : "border-primary-700/25 bg-primary-50 text-brand-ink",
    )}
  >
    <p className="font-medium">{title}</p>
    {children ? <div className="mt-1 text-[#4B5468]">{children}</div> : null}
  </div>
);

export const FormContainer = ({ children }: { children: ReactNode }) => {
  return (
    <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5 sm:p-10">
      {children}
    </div>
  );
};

export const AuthPageContent = ({ children }: { children: ReactNode }) => {
  return <p className="mb-6 text-center text-sm text-gray-600">{children}</p>;
};

/**
 * Live password requirements checklist (Register + Reset password only).
 * Must be rendered via <Input hint={...}> so it can read the field's
 * "touched" state: unmet rules turn red once the user leaves the field.
 */
export const PasswordRequirements = ({ password }: { password: string }) => (
  <ul className="mt-0.5 grid gap-1 text-xs" aria-label="Password requirements">
    {passwordRules.map((rule) => {
      const met = rule.test(password);
      return (
        <li
          key={rule.id}
          className={clsx(
            "flex items-center gap-1.5 transition-colors",
            met
              ? "text-brand-ink"
              : "text-[#69728A] group-data-[touched]/field:text-[#B42318] group-data-[invalid]/field:text-[#B42318]",
          )}
        >
          {met ? (
            <Check
              aria-hidden="true"
              strokeWidth={3}
              className="h-3.5 w-3.5 shrink-0 text-primary-700"
            />
          ) : (
            <X
              aria-hidden="true"
              strokeWidth={2.5}
              className="h-3.5 w-3.5 shrink-0 opacity-70"
            />
          )}
          <span>
            {rule.label}
            <span className="sr-only">{met ? " (met)" : " (not met)"}</span>
          </span>
        </li>
      );
    })}
  </ul>
);
