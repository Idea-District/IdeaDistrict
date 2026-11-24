"use client";

import type { ReactNode } from "react";

import type { InsightTheme, PipelineStage, Room } from "@idea-district/api-client";

import { CalmState, ErrorNotice } from "@/components/ui";
import { ROOM_NAMES } from "@/features/district/rooms";

import { InvestorShell } from "./InvestorShell";

export { BackLink, focus, PersonDot, useLoad } from "@/features/cafe/shared";
export { ROOM_NAMES, ROOMS } from "@/features/district/rooms";

export const STAGES: PipelineStage[] = ["introduced", "conversation", "diligence", "passed"];

export const STAGE_NAMES: Record<PipelineStage, string> = {
  introduced: "Introduced",
  conversation: "In conversation",
  diligence: "Diligence",
  passed: "Passed",
};

export const card = "rounded-[16px] border border-rule bg-card p-4 lg:p-5";
export const inputClass =
  "min-h-[44px] w-full rounded-[10px] border border-rule bg-card px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink3/80 focus:border-espresso focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember";

/** The small "INVESTOR" eyebrow used on Forest Green brand moments. */
export function InvestorEyebrow({ children = "Investor", onDark = false }: { children?: ReactNode; onDark?: boolean }) {
  return (
    <p className={`text-[11.5px] font-bold uppercase tracking-[0.18em] ${onDark ? "text-ember-light" : "text-espresso"}`}>{children}</p>
  );
}

export function PageTitle({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: ReactNode }) {
  return (
    <header className="mb-6">
      <InvestorEyebrow>{eyebrow ?? "Investor"}</InvestorEyebrow>
      <h1 className="mt-1 text-[28px] font-bold leading-[1.1] tracking-[-0.02em] text-ink">{title}</h1>
      {sub ? <div className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-ink2">{sub}</div> : null}
    </header>
  );
}

export function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink3">
      {children}
    </h2>
  );
}

/** Thesis fit in words, never a number. */
export function ThesisFit({ fit }: { fit: string | null }) {
  if (!fit) return <p className="text-[13.5px] text-ink3">No clear overlap with your thesis yet.</p>;
  return (
    <p className="text-[13.5px] font-semibold text-espresso">
      Fits your thesis: <span className="inferred font-normal">{fit}</span>
    </p>
  );
}

export function roomList(rooms: Room[]) {
  return rooms.map((r) => ROOM_NAMES[r]).join(", ");
}

export function SharesLine({ rooms }: { rooms: Room[] }) {
  return (
    <p className="text-[13.5px] text-ink2">
      <span className="font-semibold text-ink">Shares: </span>
      {rooms.length ? roomList(rooms) : "only their public card"}
    </p>
  );
}

export function themeWord(t: InsightTheme) {
  return t.founders === "many" ? "many founders" : "several founders";
}

/** Loading or error inside the shell, so navigation stays in place. */
export function Waiting({ error, retry, title, back }: { error: string | null; retry: () => void; title: string; back?: ReactNode }) {
  return (
    <InvestorShell>
      {back}
      {error ? <ErrorNotice message={error} onRetry={retry} /> : <CalmState title={title} />}
    </InvestorShell>
  );
}
