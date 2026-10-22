import { ApiError } from "@idea-district/api-client";

/** Human message for anything thrown by the API client (or the network). */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    // FastAPI validation errors put a list in `detail`; don't show "[object Object]".
    const detail = e.body?.detail as unknown;
    const base =
      typeof detail === "string" && detail
        ? detail
        : typeof e.body?.error === "string" && e.body.error
          ? e.body.error
          : `The request failed (${e.status}).`;
    if (e.status === 503) return `${base} The AI didn't answer in time — it usually works on a second try.`;
    return base;
  }
  if (e instanceof TypeError) return "We couldn't reach the Idea District API. Check it is running, then try again.";
  if (e instanceof Error) return e.message;
  return "Something unexpected happened.";
}
