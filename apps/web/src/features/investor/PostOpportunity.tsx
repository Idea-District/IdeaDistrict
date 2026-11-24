"use client";

import { useId, useState, type FormEvent } from "react";

import type { OpportunityKind } from "@idea-district/api-client";

import { Button, ErrorNotice } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

import { InvestorShell } from "./InvestorShell";
import { card, inputClass, PageTitle, SectionTitle, useLoad } from "./parts";

const KINDS: { value: OpportunityKind; label: string }[] = [
  { value: "pilot_call", label: "Pilot call" },
  { value: "challenge", label: "Challenge" },
  { value: "problem", label: "Problem statement" },
  { value: "circle", label: "Open circle" },
];
const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.value, k.label])) as Record<OpportunityKind, string>;

const EMPTY = { kind: "pilot_call" as OpportunityKind, title: "", summary: "", what_they_need: "", timeline: "", how_to_respond: "", tags: "", closes_on: "" };

/** I8 · Post an opportunity founders can say they're interested in, and see who did. */
export function PostOpportunity({ investorId }: { investorId: string }) {
  const mine = useLoad(() => api.investorOpportunities(investorId), investorId);
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState<string | null>(null);
  const base = useId();
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setPosted(null);
    try {
      await api.postOpportunity(investorId, { ...f, closes_on: f.closes_on || null });
      setPosted(f.title);
      setF(EMPTY);
      mine.retry();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const field = (k: keyof typeof EMPTY, label: string, opts: { area?: boolean; required?: boolean; hint?: string; type?: string } = {}) => (
    <div>
      <label htmlFor={`${base}-${k}`} className="mb-1 block text-[13.5px] font-semibold text-ink2">
        {label}
        {opts.hint ? <span className="font-normal text-ink3"> ({opts.hint})</span> : null}
      </label>
      {opts.area ? (
        <textarea id={`${base}-${k}`} value={f[k]} onChange={set(k)} rows={3} required={opts.required} className={`${inputClass} resize-y`} />
      ) : (
        <input id={`${base}-${k}`} type={opts.type ?? "text"} value={f[k]} onChange={set(k)} required={opts.required} className={inputClass} />
      )}
    </div>
  );

  return (
    <InvestorShell>
      <PageTitle title="Post an opportunity" sub="Founders see it alongside other opportunities. Founders who express interest share their name and note with you." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <form onSubmit={submit} className={`${card} flex flex-col gap-4`} aria-label="New opportunity">
          <div>
            <label htmlFor={`${base}-kind`} className="mb-1 block text-[13.5px] font-semibold text-ink2">
              Kind
            </label>
            <select id={`${base}-kind`} value={f.kind} onChange={set("kind")} className={inputClass}>
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
          {field("title", "Title", { required: true })}
          {field("summary", "Summary", { area: true, required: true })}
          {field("what_they_need", "What you need", { area: true, required: true })}
          {field("timeline", "Timeline", { required: true })}
          {field("how_to_respond", "How to respond", { required: true })}
          {field("tags", "Tags", { hint: "comma separated" })}
          {field("closes_on", "Closing date", { hint: "optional", type: "date" })}
          {error ? <ErrorNotice message={error} /> : null}
          <Button type="submit" variant="dark" disabled={busy}>
            {busy ? "Posting…" : "Post the opportunity"}
          </Button>
          <p role="status" className="text-[13.5px] text-ink2">
            {posted ? `Posted: ${posted}.` : ""}
          </p>
        </form>

        <section aria-labelledby="yours" className="flex flex-col gap-3">
          <SectionTitle id="yours">Your opportunities</SectionTitle>
          <p className="text-[13.5px] text-ink3">Founders who express interest share their name and note with you.</p>
          {!mine.data ? (
            mine.error ? (
              <ErrorNotice message={mine.error} onRetry={mine.retry} />
            ) : (
              <p className="text-[14px] text-ink3">Loading…</p>
            )
          ) : mine.data.length === 0 ? (
            <div className={card}>
              <p className="text-[14.5px] text-ink2">Nothing posted yet.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {mine.data.map((o) => (
                <li key={o.id} className={card}>
                  <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-espresso">
                    {KIND_LABEL[o.kind] ?? o.kind}
                    {o.archived ? " · Closed" : ""}
                  </p>
                  <p className="mt-1 text-[16px] font-bold text-ink">{o.title}</p>
                  {o.interested.length === 0 ? (
                    <p className="mt-2 text-[13.5px] text-ink3">No founders interested yet.</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-rule">
                      {o.interested.map((i) => (
                        <li key={i.founder_id} className="py-2">
                          <p className="text-[14.5px] font-bold text-ink">{i.name}</p>
                          {i.note ? <p className="text-[14px] text-ink2">{i.note}</p> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </InvestorShell>
  );
}
