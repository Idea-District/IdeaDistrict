"use client";

import Link from "next/link";
import { useState } from "react";

import type { OpportunityKind, OpportunitySummary } from "@idea-district/api-client";

import { AppShell, CalmState, ErrorNotice } from "@/components/ui";
import { BackLink, Eyebrow, focus, useLoad } from "@/features/cafe/shared";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

import { closesLabel, KIND_LABEL, SaveToggle } from "./shared";

type Filter = "all" | "for_you" | OpportunityKind;
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "for_you", label: "For you" },
  { value: "pilot_call", label: "Pilot calls" },
  { value: "challenge", label: "Challenges" },
  { value: "problem", label: "Problems" },
  { value: "circle", label: "Circles" },
];

function keep(o: OpportunitySummary, f: Filter) {
  if (f === "all") return true;
  if (f === "for_you") return o.for_you;
  return o.kind === f;
}

/** E8 · Opportunities: pilot calls, challenges, problems and circles posted by the team. */
export function Opportunities({ founderId }: { founderId: string }) {
  const { data, setData, error, retry } = useLoad(() => api.opportunities(founderId), founderId);
  const [filter, setFilter] = useState<Filter>("all");
  const [saveError, setSaveError] = useState<string | null>(null);
  const shown = data?.filter((o) => keep(o, filter)) ?? [];

  async function toggle(o: OpportunitySummary) {
    const on = !o.saved;
    setSaveError(null);
    setData((list) => list?.map((x) => (x.id === o.id ? { ...x, saved: on } : x)) ?? null);
    try {
      const updated = await api.respondToOpportunity(o.id, { founder_id: founderId, saved: on });
      setData((list) => list?.map((x) => (x.id === o.id ? { ...x, saved: updated.saved, interested: updated.interested } : x)) ?? null);
    } catch (e) {
      setSaveError(errorMessage(e));
      setData((list) => list?.map((x) => (x.id === o.id ? { ...x, saved: !on } : x)) ?? null);
    }
  }

  return (
    <AppShell>
      <BackLink href="/people" label="People" />
      <Eyebrow>Opportunities</Eyebrow>
      <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.02em]">Pilot calls, challenges and circles</h1>
      <p className="mt-2 max-w-[56ch] text-[15px] text-ink2">Posted by the team and people they trust. Say you&rsquo;re interested and they&rsquo;ll be in touch if it&rsquo;s a fit.</p>

      <div role="group" aria-label="Filter opportunities" className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`min-h-[44px] rounded-full border px-4 text-[14px] font-semibold ${filter === f.value ? "border-ink bg-ink text-cream" : "border-rule bg-card hover:border-ink"} ${focus}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mt-5">
          <ErrorNotice message={error} onRetry={retry} />
        </div>
      ) : null}
      {saveError ? (
        <p role="alert" className="mt-3 text-[13.5px] text-ember-deep">
          {saveError}
        </p>
      ) : null}
      {!data && !error ? <CalmState title="Finding opportunities…" /> : null}
      {data && shown.length === 0 ? (
        <p className="mt-6 text-[15px] text-ink3">
          {filter === "for_you" ? "Nothing matches your District yet. Try All." : "Nothing here right now. Check back soon."}
        </p>
      ) : null}

      <ul className="mt-5 grid gap-3 md:grid-cols-2">
        {shown.map((o) => (
          <li key={o.id} className="relative flex flex-col gap-2 rounded-[16px] border border-rule bg-card p-5 hover:border-ink">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-ink3">
                  <span className="uppercase tracking-[0.1em]">{KIND_LABEL[o.kind]}</span>
                  {o.for_you ? <span className="rounded-full bg-ember px-2 py-0.5 text-[11px] font-bold text-ink">For you</span> : null}
                  {o.interested ? <span className="rounded-full bg-espresso px-2 py-0.5 text-[11px] font-bold text-cream">You&rsquo;re interested</span> : null}
                </p>
                <h2 className="mt-1 text-[17px] font-bold leading-snug">
                  <Link href={`/people/opportunities/${o.id}`} className={`rounded after:absolute after:inset-0 after:content-[''] ${focus}`}>
                    {o.title}
                  </Link>
                </h2>
                <p className="mt-0.5 text-[13px] text-ink3">Posted by {o.posted_by}</p>
              </div>
              <div className="relative z-10">
                <SaveToggle saved={o.saved} title={o.title} onToggle={() => void toggle(o)} />
              </div>
            </div>
            <p className="text-[14px] leading-relaxed text-ink2">{o.summary}</p>
            {o.closes_on ? <p className="text-[12.5px] font-semibold text-ember-deep">Closes {closesLabel(o.closes_on)}</p> : null}
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
