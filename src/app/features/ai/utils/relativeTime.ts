/** "2 hours ago", "yesterday"… from unix seconds; "—" when unknown. */
export const relativeTime = (unixSeconds: number | null) => {
  if (!unixSeconds) return "—";
  const diff = unixSeconds * 1000 - Date.now();
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const minutes = Math.round(diff / 60_000);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  return rtf.format(Math.round(hours / 24), "day");
};
