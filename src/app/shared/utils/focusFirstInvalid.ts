/**
 * After a failed submit, move keyboard/screen-reader focus to the first
 * invalid field so users hear its label + error (via aria-describedby).
 * Runs on the next frame so React has rendered aria-invalid first.
 */
export const focusFirstInvalidField = (form?: HTMLFormElement | null) => {
  if (!form || typeof window === "undefined") return;
  window.requestAnimationFrame(() => {
    const target = form.querySelector<HTMLElement>(
      '[aria-invalid="true"], input:invalid',
    );
    target?.focus();
  });
};
