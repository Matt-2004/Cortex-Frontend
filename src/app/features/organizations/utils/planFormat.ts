import type { PlanDto } from "../types/subscription.types";

/** Display only: every value comes from the backend. */
export const formatPlanPrice = (plan: PlanDto) => {
  if (plan.priceMinor === 0) return "Free";
  const amount = plan.priceMinor / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: plan.currency,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    // A currency code Intl does not know: show it as the backend sent it.
    return `${amount.toLocaleString()} ${plan.currency}`;
  }
};

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"];

export const formatBytes = (bytes: number) => {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: unit > 0 && value < 10 ? 1 : 0,
  })} ${BYTE_UNITS[unit]}`;
};
