import type { OpportunityKind } from "@idea-district/api-client";

import { focus } from "@/features/cafe/shared";

export const KIND_LABEL: Record<OpportunityKind, string> = {
  pilot_call: "Pilot call",
  challenge: "Challenge",
  problem: "Problem",
  circle: "Circle",
};

/** "2026-12-05" → "Sat 5 Dec" (a calendar day, so no time-zone shift). */
export function closesLabel(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function SaveToggle({ saved, title, onToggle, disabled }: { saved: boolean; title: string; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Saved: ${title}` : `Save ${title}`}
      disabled={disabled}
      onClick={onToggle}
      className={`min-h-[44px] shrink-0 rounded-full border px-4 text-[13.5px] font-semibold disabled:opacity-60 ${saved ? "border-ink bg-ink text-cream" : "border-rule bg-screen hover:border-ink"} ${focus}`}
    >
      {saved ? "Saved" : "Save"}
    </button>
  );
}
