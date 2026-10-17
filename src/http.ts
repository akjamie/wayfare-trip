export interface FetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal },
) => Promise<FetchResponse>;

export const httpFetch: FetchLike = (url, init) =>
  fetch(url, init) as unknown as Promise<FetchResponse>;

/** GET + parse JSON with a hard timeout. Throws on non-2xx, timeout, or network error. */
export async function getJson(
  fetchImpl: FetchLike,
  url: string,
  timeoutMs: number,
): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`upstream HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
