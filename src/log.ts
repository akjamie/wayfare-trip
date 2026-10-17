/**
 * Minimal structured server-side logging for upstream failures.
 * Deliberately never logs URLs (they carry the Amap key) or user input.
 */
export function logUpstreamError(code: string, cause: unknown): void {
  const kind =
    cause instanceof Error ? cause.name : cause === undefined ? "unknown" : typeof cause;
  console.error(`[wayfare-trip] upstream failure -> ${code} (cause=${kind})`);
}
