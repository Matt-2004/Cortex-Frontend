import z from "zod";
import { AUTH_LIMITS } from "../types/auth-api.types";

const emailSchema = z
  .string()
  .trim()
  .pipe(
    z
      .email("Enter a valid email address")
      .max(AUTH_LIMITS.emailMax, `Email must be ${AUTH_LIMITS.emailMax} characters or fewer`),
  );

/** The API takes one `name`; the form sends "first last". */
export const toFullName = (firstName: string, lastName: string) =>
  `${firstName.trim()} ${lastName.trim()}`.trim();

/* ────────────────────────────────────────────────────────────
 * Password policy — single source of truth.
 * Used by the Register / Reset password schemas AND by the
 * live <PasswordRequirements> checklist, so they never drift.
 * Login deliberately does NOT use this (no hints on sign-in).
 * ──────────────────────────────────────────────────────────── */

export const PASSWORD_MAX_LENGTH = 20;

export const passwordRules = [
  {
    id: "length",
    label: "At least 8 characters",
    message: "Password must be at least 8 characters",
    test: (value: string) => value.length >= 8,
  },
  {
    id: "uppercase",
    label: "At least 1 uppercase letter",
    message: "Password must contain at least 1 uppercase letter",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    id: "symbol",
    label: "At least 1 symbol (e.g. ! @ # $)",
    message: "Password must contain at least 1 symbol",
    test: (value: string) => /[^A-Za-z0-9\s]/.test(value),
  },
] as const;

export const isPasswordValid = (value: string) =>
  value.length <= PASSWORD_MAX_LENGTH &&
  passwordRules.every((rule) => rule.test(value));

const passwordSchema = passwordRules
  .reduce(
    (schema, rule) => schema.refine(rule.test, { message: rule.message }),
    z.string(),
  )
  .refine((value) => value.length <= PASSWORD_MAX_LENGTH, {
    message: `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer`,
  });

/** Sign-in: only checks the fields are filled in. No password rules/hints. */
export const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});

export const AdminLoginSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address")),
  password: z.string().min(1, "Enter your password"),
});

export const RegisterSchema = z
  .object({
    firstName: z.string().trim().min(1, "Enter your first name"),
    lastName: z.string().trim().min(1, "Enter your last name"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    agreeToTerms: z.boolean().refine((value) => value === true, {
      message: "You must agree to the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
    // Check the match even while other fields are still invalid.
    when: (payload) =>
      typeof (payload.value as { confirmPassword?: unknown })
        ?.confirmPassword === "string",
  })
  .refine(
    (data) => toFullName(data.firstName, data.lastName).length <= AUTH_LIMITS.nameMax,
    {
      message: `First and last name together must be ${AUTH_LIMITS.nameMax} characters or fewer`,
      path: ["lastName"],
      when: (payload) => {
        const v = payload.value as { firstName?: unknown; lastName?: unknown };
        return typeof v?.firstName === "string" && typeof v?.lastName === "string";
      },
    },
  );

export const ResetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmedPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmedPassword, {
    message: "Passwords do not match",
    path: ["confirmedPassword"],
    when: (payload) =>
      typeof (payload.value as { confirmedPassword?: unknown })
        ?.confirmedPassword === "string",
  });

export const sendEmailSchema = z.object({
  email: emailSchema,
});
