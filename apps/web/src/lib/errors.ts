import { ApiError } from "@idea-district/api-client";

/** Human message for anything thrown by the API client (or the network). */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 503) return `${e.message} The AI didn't answer in time — it usually works on a second try.`;
    return e.message;
  }
  if (e instanceof TypeError) return "We couldn't reach the Idea District API. Check it is running, then try again.";
  if (e instanceof Error) return e.message;
  return "Something unexpected happened.";
}
