"use client";

import type { MatchPerson } from "@idea-district/api-client";

import { personLine } from "@/lib/format";
import { focus } from "@/features/cafe/shared";

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

/** "Mon 24 Nov" from a YYYY-MM-DD date, without time-zone drift. */
export function weekdayText(ymd: string) {
  const [y, m, d] = ymd.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** Name plus "building · stage · city", the public card every member may see. */
export function PersonText({ person, as: Tag = "p" }: { person: MatchPerson; as?: "p" | "h2" | "h3" }) {
  return (
    <div className="min-w-0">
      <Tag className="text-[16px] font-bold leading-snug text-ink">{person.name}</Tag>
      <p className="mt-0.5 text-[13.5px] leading-snug text-ink2">{personLine(person)}</p>
    </div>
  );
}

export const smallLinkClass = `inline-flex min-h-[44px] items-center rounded px-2 text-[14px] font-semibold text-ink2 underline underline-offset-4 hover:text-ink ${focus}`;
