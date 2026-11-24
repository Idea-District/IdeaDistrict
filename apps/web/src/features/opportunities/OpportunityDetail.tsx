"use client";

import { useId, useState } from "react";

import type { OpportunityDetail as Detail } from "@idea-district/api-client";

import { AppShell, Button, CalmState, ErrorNotice, ReadStrength } from "@/components/ui";
import { BackLink, focus, useLoad } from "@/features/cafe/shared";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

import { closesLabel, KIND_LABEL, SaveToggle } from "./shared";

/** E9 · One opportunity: what they need, why ID thinks it fits, and a way to say you're interested. */
export function OpportunityDetail({ founderId, oppId }: { founderId: string; oppId: string }) {
  const { data, setData, error, retry } = useLoad(() => api.opportunity(oppId, founderId), `${oppId}:${founderId}`);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const noteId = useId();

  async function toggleSave(d: Detail) {
    const on = !d.saved;
    setActionError(null);
    setData((x) => (x ? { ...x, saved: on } : x));
    try {
      setData(await api.respondToOpportunity(d.id, { founder_id: founderId, saved: on }));
    } catch (e) {
      setActionError(errorMessage(e));
      setData((x) => (x ? { ...x, saved: !on } : x));
    }
  }

  async function setInterest(interested: boolean) {
    setBusy(true);
    setActionError(null);
    try {
      // Withdrawing also clears the note, so nothing the founder wrote stays with the team.
      const input = { founder_id: founderId, interested, note: interested ? note.trim() : "" };
      setData(await api.respondToOpportunity(oppId, input));
      if (interested) setNote("");
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <BackLink href="/people/opportunities" label="Opportunities" />
      {error ? <ErrorNotice message={error} onRetry={retry} /> : null}
      {!data && !error ? <CalmState title="Opening the opportunity…" /> : null}
      {data ? (
        <article>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ember-deep">
                {KIND_LABEL[data.kind]}
                {data.for_you ? " · For you" : ""}
              </p>
              <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.02em]">{data.title}</h1>
              <p className="mt-1 text-[14px] font-semibold text-ink3">Posted by {data.posted_by}</p>
            </div>
            <SaveToggle saved={data.saved} title={data.title} onToggle={() => void toggleSave(data)} />
          </div>
          <p className="mt-3 text-[16px] leading-relaxed text-ink2">{data.summary}</p>
          {data.closes_on ? <p className="mt-2 text-[14px] font-semibold text-ember-deep">Closes {closesLabel(data.closes_on)}</p> : null}

          <section className="mt-6 rounded-[16px] bg-espresso p-5 text-cream" aria-labelledby="fit-h">
            <h2 id="fit-h" className="text-[11px] font-bold uppercase tracking-[0.12em] text-ember-light">
              Why ID thinks this fits you
            </h2>
            {data.fit ? (
              <>
                <p className="mt-2 text-[16px] italic leading-snug">{data.fit.reason}</p>
                <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-cream/80">
                  <ReadStrength value={data.fit.confidence} className="text-ember-light!" />
                  <span aria-hidden>·</span>
                  <span>Based on: {data.fit.rests_on}</span>
                </p>
              </>
            ) : (
              <p className="mt-2 text-[15px] leading-snug">Nothing in your District points here yet, but you can still say you&rsquo;re interested.</p>
            )}
          </section>

          <div className="mt-6 flex flex-col gap-3">
            {[
              { h: "What they need", b: data.what_they_need },
              { h: "Timeline", b: data.timeline },
              { h: "How to respond", b: data.how_to_respond },
            ]
              .filter((s) => s.b)
              .map((s) => (
                <section key={s.h} className="rounded-[16px] border border-rule bg-card p-5">
                  <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink3">{s.h}</h2>
                  <p className="mt-1.5 whitespace-pre-line text-[15.5px] leading-relaxed text-ink">{s.b}</p>
                </section>
              ))}
            {data.closes_on ? (
              <section className="rounded-[16px] border border-rule bg-card p-5">
                <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink3">Closing date</h2>
                <p className="mt-1.5 text-[15.5px] text-ink">{closesLabel(data.closes_on)}</p>
              </section>
            ) : null}
          </div>

          <section className="mt-6 rounded-[16px] border border-rule bg-card p-5" aria-labelledby="interest-h">
            <h2 id="interest-h" className="text-[17px] font-bold">
              {data.interested ? "You're interested" : "Interested?"}
            </h2>
            {data.interested ? (
              <>
                <p role="status" className="mt-1.5 text-[15px] leading-relaxed text-ink2">
                  {data.posted_by} and the Idea District team see your name and note, nothing else. They&rsquo;ll be in touch if it&rsquo;s a fit.
                </p>
                <Button variant="secondary" className="mt-4 sm:w-auto sm:px-5" disabled={busy} onClick={() => void setInterest(false)}>
                  {busy ? "Withdrawing…" : "Withdraw interest"}
                </Button>
              </>
            ) : (
              <form
                className="mt-3 flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void setInterest(true);
                }}
              >
                <label htmlFor={noteId} className="text-[14px] font-semibold text-ink">
                  A line or two on what you&rsquo;d bring (optional)
                </label>
                <textarea
                  id={noteId}
                  rows={3}
                  maxLength={600}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={busy}
                  className={`min-h-[88px] w-full resize-y rounded-[10px] border border-rule bg-screen px-3 py-2.5 text-[15px] text-ink placeholder:text-ink3 ${focus}`}
                />
                <Button type="submit" className="sm:w-auto sm:self-start sm:px-5" disabled={busy}>
                  {busy ? "Sending…" : "I'm interested"}
                </Button>
              </form>
            )}
            {actionError ? (
              <p role="alert" className="mt-3 text-[13.5px] text-ember-deep">
                {actionError}
              </p>
            ) : null}
          </section>
        </article>
      ) : null}
    </AppShell>
  );
}
