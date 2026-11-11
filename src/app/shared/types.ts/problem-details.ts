/**
 * RFC 7807 error body (`application/problem+json`) returned by the Cortex
 * backend for every 4xx/5xx, and by our own /api/* proxies.
 */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  /** Human-readable message — safe to show to the user. */
  detail?: string;
  /** Only on 400 validation errors. Keys match the request field names. */
  errors?: Record<string, string[] | string>;
  /** Include in bug reports. */
  traceId?: string;
  instance?: string;
}
