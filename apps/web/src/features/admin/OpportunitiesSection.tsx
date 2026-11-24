"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { buttonClass, CalmState, ErrorNotice } from "@/components/ui";
import { adminErrorMessage, isAuthError, type AdminOpportunity, type OpportunityKindAdmin } from "@/lib/adminApi";

import { Card, dayLabel, Field, inputClass, Pill, Saved, smallButton, useAdmin, useAdminAction, whenLabel } from "./parts";

const KINDS: { value: OpportunityKindAdmin; label: string }[] = [
  { value: "pilot_call", label: "Pilot call" },
  { value: "challenge", label: "Challenge" },
  { value: "problem", label: "Problem" },
  { value: "circle", label: "Circle" },
];
const kindLabel = (k: OpportunityKindAdmin) => KINDS.find((x) => x.value === k)?.label ?? k;

export type OpportunitiesState = {
  opportunities: AdminOpportunity[] | null;
  error: string | null;
  /** Refetches the list; never throws. */
  reload: () => Promise<void>;
};

/** Loads the opportunities. They are not part of the Cafe overview, so the tab fetches them itself. */
export function useOpportunities(): OpportunitiesState {
  const { client, onAuthLost } = useAdmin();
  const [opportunities, setOpportunities] = useState<AdminOpportunity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fail = useCallback(
    (e: unknown) => {
      if (isAuthError(e)) onAuthLost(adminErrorMessage(e));
      else setError(adminErrorMessage(e));
    },
    [onAuthLost],
  );

  const reload = useCallback(async () => {
    try {
      setOpportunities(await client.listOpportunities());
      setError(null);
    } catch (e) {
      fail(e);
    }
  }, [client, fail]);

  // First load for each client; later changes call reload() directly.
  useEffect(() => {
    let live = true;
    client.listOpportunities().then(
      (next) => {
        if (!live) return;
        setOpportunities(next);
        setError(null);
      },
      (e) => {
        if (live) fail(e);
      },
    );
    return () => {
      live = false;
    };
  }, [client, fail]);

  return { opportunities, error, reload };
}

/** Opportunities: pilot calls, challenges, problems and circles founders see under People. */
export function OpportunitiesSection({ state }: { state: OpportunitiesState }) {
  const { opportunities, error, reload } = state;

  if (!opportunities)
    return error ? (
      <div className="mx-auto w-full max-w-[480px]">
        <ErrorNotice message={error} onRetry={() => void reload()} />
      </div>
    ) : (
      <CalmState title="Loading opportunities" />
    );

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex flex-col gap-4">
        {error ? <ErrorNotice message={`Couldn't refresh: ${error}`} onRetry={() => void reload()} /> : null}
        <OpportunityList opportunities={opportunities} reload={reload} />
      </div>
      <AddOpportunity reload={reload} />
    </div>
  );
}

function OpportunityList({ opportunities, reload }: { opportunities: AdminOpportunity[]; reload: () => Promise<void> }) {
  const { busy, error, run } = useAdminAction();
  const [confirming, setConfirming] = useState<string | null>(null);
  const live = opportunities.filter((o) => !o.archived).length;

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[18px] font-bold">Opportunities</h2>
        <p className="text-[13px] text-ink3">{live} live · archived ones leave the founders&apos; list</p>
      </div>

      {error ? (
        <div className="mt-3">
          <ErrorNotice message={error} />
        </div>
      ) : null}

      {opportunities.length === 0 ? (
        <p className="mt-4 text-[14.5px] text-ink2">No opportunities yet. Post the first one.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {opportunities.map((o) => (
            <li
              key={o.id}
              className={`flex flex-col gap-3 rounded-[12px] p-3.5 sm:flex-row sm:items-start ${o.archived ? "border border-rule bg-screen/60" : "border border-rule"}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={o.kind === "pilot_call" ? "tint" : "plain"}>{kindLabel(o.kind)}</Pill>
                  {o.archived ? <Pill tone="muted">Archived</Pill> : null}
                </div>
                <h3 className={`mt-1.5 text-[15.5px] font-bold leading-snug ${o.archived ? "text-ink2" : ""}`}>{o.title}</h3>
                <p className="mt-1 text-[12.5px] text-ink3">
                  Posted by {o.posted_by}
                  {o.closes_on ? ` · Closes ${dayLabel(o.closes_on, true)}` : " · No closing date"}
                </p>

                <div className="mt-2.5">
                  <p className="text-[12.5px] font-bold text-ink2">
                    {o.interested.length === 0
                      ? "No one interested yet"
                      : `${o.interested.length} interested founder${o.interested.length === 1 ? "" : "s"}`}
                  </p>
                  {o.interested.length ? (
                    <ul className="mt-1.5 flex flex-col gap-1.5">
                      {o.interested.map((p, i) => (
                        <li key={`${p.name}-${i}`} className="rounded-[10px] bg-sand2 px-3 py-2 text-[13.5px]">
                          <span className="font-bold text-ink">{p.name}</span>
                          {p.at ? <span className="text-ink3"> · {whenLabel(p.at)}</span> : null}
                          {p.note ? <p className="mt-0.5 text-ink2">{p.note}</p> : <p className="mt-0.5 text-ink3">No note</p>}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
              {!o.archived ? (
                <div className="flex shrink-0 gap-2 self-start">
                  {confirming === o.id ? (
                    <>
                      <button
                        type="button"
                        className={smallButton("danger")}
                        disabled={busy !== null}
                        onClick={async () => {
                          await run(
                            o.id,
                            async (c) => {
                              await c.archiveOpportunity(o.id);
                              await reload();
                            },
                            { refresh: false },
                          );
                          setConfirming(null);
                        }}
                      >
                        {busy === o.id ? "Archiving…" : "Confirm archive"}
                      </button>
                      <button type="button" className={smallButton()} disabled={busy !== null} onClick={() => setConfirming(null)}>
                        Keep
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className={smallButton("danger")}
                      disabled={busy !== null}
                      onClick={() => setConfirming(o.id)}
                      aria-label={`Archive ${o.title}`}
                    >
                      Archive
                    </button>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function AddOpportunity({ reload }: { reload: () => Promise<void> }) {
  const { busy, error, run } = useAdminAction();
  const [kind, setKind] = useState<OpportunityKindAdmin>("pilot_call");
  const [title, setTitle] = useState("");
  const [postedBy, setPostedBy] = useState("");
  const [summary, setSummary] = useState("");
  const [need, setNeed] = useState("");
  const [timeline, setTimeline] = useState("");
  const [howTo, setHowTo] = useState("");
  const [tags, setTags] = useState("");
  const [closesOn, setClosesOn] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const saving = busy !== null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaved(null);
    const res = await run(
      "add",
      async (c) => {
        const out = await c.addOpportunity({
          kind,
          title: title.trim(),
          posted_by: postedBy.trim(),
          summary: summary.trim(),
          what_they_need: need.trim(),
          timeline: timeline.trim(),
          how_to_respond: howTo.trim(),
          tags: tags.trim(),
          ...(closesOn ? { closes_on: closesOn } : {}),
        });
        await reload();
        return out;
      },
      { refresh: false },
    );
    if (res) {
      setSaved(`Posted "${title.trim()}".`);
      setKind("pilot_call");
      setTitle("");
      setPostedBy("");
      setSummary("");
      setNeed("");
      setTimeline("");
      setHowTo("");
      setTags("");
      setClosesOn("");
    }
  }

  return (
    <Card>
      <h2 className="text-[18px] font-bold">Post an opportunity</h2>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
        <fieldset disabled={saving} className="flex flex-col gap-4">
          <Field label="Kind">
            {(p) => (
              <select {...p} value={kind} onChange={(e) => setKind(e.target.value as OpportunityKindAdmin)} className={inputClass}>
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Title" hint="4 to 200 characters.">
            {(p) => <input {...p} required minLength={4} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />}
          </Field>
          <Field label="Posted by" hint="The organisation or person behind it.">
            {(p) => <input {...p} required minLength={2} maxLength={160} value={postedBy} onChange={(e) => setPostedBy(e.target.value)} className={inputClass} />}
          </Field>
          <Field label="Summary" hint="10 to 600 characters. Shown on the card.">
            {(p) => (
              <textarea {...p} required minLength={10} maxLength={600} rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} className={`${inputClass} resize-y`} />
            )}
          </Field>
          <Field label="What they need" optional>
            {(p) => <textarea {...p} maxLength={1500} rows={3} value={need} onChange={(e) => setNeed(e.target.value)} className={`${inputClass} resize-y`} />}
          </Field>
          <Field label="Timeline" optional>
            {(p) => <input {...p} maxLength={200} value={timeline} onChange={(e) => setTimeline(e.target.value)} className={inputClass} />}
          </Field>
          <Field label="How to respond" optional>
            {(p) => <textarea {...p} maxLength={1000} rows={2} value={howTo} onChange={(e) => setHowTo(e.target.value)} className={`${inputClass} resize-y`} />}
          </Field>
          <Field label="Tags" optional hint="Keywords that match a founder's District, used for the For you filter">
            {(p) => <input {...p} maxLength={300} value={tags} onChange={(e) => setTags(e.target.value)} className={inputClass} />}
          </Field>
          <Field label="Closing date" optional>
            {(p) => <input {...p} type="date" value={closesOn} onChange={(e) => setClosesOn(e.target.value)} className={inputClass} />}
          </Field>
        </fieldset>
        {error ? <ErrorNotice message={error} /> : null}
        {saved ? <Saved>{saved}</Saved> : null}
        <button type="submit" className={buttonClass("primary")} disabled={saving}>
          {saving ? "Posting…" : "Post opportunity"}
        </button>
      </form>
    </Card>
  );
}
