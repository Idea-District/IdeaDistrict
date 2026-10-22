import type { ApiErrorBody, Health } from "./types";

export * from "./types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody | null,
  ) {
    super(body?.detail ?? body?.error ?? `API request failed with ${status}`);
  }
}

/** One client for web and mobile. Pass the API base URL, e.g. http://localhost:8000. */
export function createApiClient(baseUrl: string, getToken?: () => string | null) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = getToken?.();
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/v1${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
      throw new ApiError(res.status, body);
    }
    return (await res.json()) as T;
  }

  return {
    health: () => request<Health>("/health"),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
