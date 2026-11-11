import { useCallback, useMemo, useState } from "react";
import { ZodSchema } from "zod";

interface UseAuthFormResult<T> {
  isFormValid: boolean;
  formData: T;
  setFormData: (value: T | ((prev: T) => T)) => void;
  /** Client (zod) errors, plus server errors for fields not edited since. */
  validationErrors: Record<string, string>;
  /** Shows API validation errors inline (e.g. from useApiErrorHandler). */
  setServerErrors: (errors: Record<string, string>) => void;
}

/**
 * Custom hook for managing authentication form state and validation.
 * Separates form logic from toast notifications for better modularity.
 *
 * Validation is derived synchronously from `formData` (no effect), so
 * `isFormValid` / `validationErrors` are never one render out of date —
 * e.g. when someone types the last character and immediately presses Enter.
 *
 * NOTE: Use `onSubmit` (not `action`) on the <form> element so that
 * errors thrown by the submit function propagate correctly to callers.
 */
export const useAuthForm = <T>(
  initialFormData: T,
  schema: ZodSchema,
): UseAuthFormResult<T> => {
  const [formData, setFormData] = useState<T>(initialFormData);
  // Server errors remember the values they were reported for, so each one
  // disappears as soon as its field is edited (derived; no effect needed).
  const [serverErrors, setServerErrorState] = useState<{
    errors: Record<string, string>;
    values: T;
  } | null>(null);

  const setServerErrors = useCallback(
    (errors: Record<string, string>) =>
      setServerErrorState({ errors, values: formData }),
    [formData],
  );

  const { isFormValid, validationErrors } = useMemo(() => {
    const validationResult = schema.safeParse(formData);

    const errors: Record<string, string> = {};
    if (!validationResult.success) {
      for (const issue of validationResult.error.issues) {
        const key = String(issue.path[0] ?? "");
        // Keep the first message per field.
        if (key && !(key in errors)) errors[key] = issue.message;
      }
    }

    if (serverErrors) {
      const current = formData as Record<string, unknown>;
      const reported = serverErrors.values as Record<string, unknown>;
      for (const [key, message] of Object.entries(serverErrors.errors)) {
        if (!(key in errors) && current[key] === reported[key]) {
          errors[key] = message;
        }
      }
    }

    // Server errors don't block resubmitting; only client validation does.
    return { isFormValid: validationResult.success, validationErrors: errors };
  }, [formData, schema, serverErrors]);

  return {
    isFormValid,
    formData,
    setFormData,
    validationErrors,
    setServerErrors,
  };
};
