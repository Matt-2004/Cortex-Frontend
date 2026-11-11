import React from "react";
import { clsx } from "clsx";

/**
 * Decorative spinner. Inherits the surrounding text colour.
 * Pass `label` only when the spinner is the sole loading indicator;
 * inside a button that already says "Processing…", leave it out so
 * screen readers don't announce the state twice.
 */
const Spinner = ({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) => {
  const svg = (
    <svg
      aria-hidden="true"
      className={clsx("h-5 w-5 animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="12"
        cy="12"
        r="9.5"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M21.5 12a9.5 9.5 0 0 0-9.5-9.5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );

  if (!label) return svg;

  return (
    <span role="status" className="inline-flex">
      {svg}
      <span className="sr-only">{label}</span>
    </span>
  );
};

export default Spinner;
