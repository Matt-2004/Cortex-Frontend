/**
 * Where to send someone after they sign in, carried as `?returnTo=` through
 * the sign-in page and the Google round trip.
 *
 * The value comes from the URL, so anyone can craft it. Only same-site paths
 * on an allowlist are accepted; everything else falls back to the default
 * destination (open-redirect protection).
 */

/** Paths a sign-in may return to (matched after normalising the path). */
const ALLOWED = [
  (path: string) => path === "/invitations/accept",
  (path: string) => path === "/console" || path.startsWith("/console/"),
];

const MAX_LENGTH = 2048;
const PROBE_ORIGIN = "http://cortex.invalid";

/**
 * Control characters (incl. tab/newline, which URL parsers strip, so
 * "/\t/evil.com" would become "//evil.com") and backslashes (read as "/").
 */
const hasUnsafeCharacter = (value: string) => {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f || code === 0x5c) return true;
  }
  return false;
};

/**
 * Returns the path to navigate to, or `null` when `value` is missing or not
 * an allowed same-site path. Rejects external, protocol-relative and
 * malformed URLs.
 */
export function safeReturnTo(value: string | null | undefined): string | null {
  if (typeof value !== "string" || value.length > MAX_LENGTH) return null;
  if (hasUnsafeCharacter(value)) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;

  let url: URL;
  try {
    url = new URL(value, PROBE_ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== PROBE_ORIGIN) return null;
  if (!ALLOWED.some((allowed) => allowed(url.pathname))) return null;

  return `${url.pathname}${url.search}${url.hash}`;
}

/** Reads and validates `?returnTo=` from the current browser URL. */
export function returnToFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  return safeReturnTo(
    new URLSearchParams(window.location.search).get("returnTo"),
  );
}

/** Appends `returnTo` to a path, e.g. the sign-in page or Google callback. */
export function withReturnTo(path: string, returnTo: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}returnTo=${encodeURIComponent(returnTo)}`;
}
