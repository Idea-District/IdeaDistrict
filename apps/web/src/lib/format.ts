import type { MatchPerson } from "@idea-district/api-client";

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** The API sometimes sends naive ISO times (no zone); they are UTC. */
function parseIso(iso: string) {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
}

/** "12 Oct" — a short, stable date (no "now" needed, so it renders the same everywhere). */
export function shortDate(iso: string | null | undefined) {
  if (!iso) return "";
  const d = parseIso(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** "14:05" */
export function shortTime(iso: string) {
  const d = parseIso(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function personLine(p: MatchPerson) {
  return [p.building, p.stage, p.city].filter(Boolean).join(" · ");
}
