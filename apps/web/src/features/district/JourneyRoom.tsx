"use client";

import { useId, useState, type FormEvent } from "react";

import type { JourneyItem } from "@idea-district/api-client";

import { AppShell, buttonClass } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { focus, useLoad } from "@/features/cafe/shared";

import { ActionError, ConfirmButton, dayText, fieldClass, RoomHeader, RoomWaiting, today, useAudience } from "./rooms";

type Filter = "all" | JourneyItem["kind"];
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "milestone", label: "Milestones" },
  { value: "decision", label: "Decisions" },
  { value: "reflection", label: "Reflections" },
  { value: "simulation", label: "Tested assumptions" },
];
const KIND_WORD: Record<JourneyItem["kind"], string> = { milestone: "Milestone", decision: "Decision", reflection: "Reflection", simulation: "Tested assumption" };

const TITLE = "Journey";

function AddForm({ founderId, onSaved }: { founderId: string; onSaved: (items: JourneyItem[]) => void }) {
  const [kind, setKind] = useState<"milestone" | "decision">("milestone");
  const [title, setTitle] = useState("");
  const [on, setOn] = useState(today());
  const [learned, setLearned] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const dateId = useId();
  const learnedId = useId();
  const kindLabel = useId();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim() || !on) return;
    setSaving(true);
    setError(null);
    try {
      const items = await api.addJourney({ founder_id: founderId, kind, title: title.trim(), on, learned: learned.trim() });
      onSaved(items);
      setTitle("");
      setLearned("");
      setOn(today());
      (e.target as HTMLFormElement).closest("details")?.removeAttribute("open");
    } catch (err) {
      setError(`Couldn't save that. ${errorMessage(err)}`);
    } finally {
      setSaving(false);
    }
  }

  const isMilestone = kind === "milestone";

  return (
    <form onSubmit={submit} className="px-5 pb-5">
      <p id={kindLabel} className="text-[14px] font-bold">
        What is it?
      </p>
      <div role="radiogroup" aria-labelledby={kindLabel} className="mt-1.5 inline-flex rounded-full border border-rule bg-screen p-1">
        {(["milestone", "decision"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={`min-h-[44px] rounded-full px-4 text-[14px] font-semibold ${kind === k ? "bg-ink text-cream" : "text-ink2 hover:text-ink"} ${focus}`}
          >
            {KIND_WORD[k]}
          </button>
        ))}
      </div>

      <label htmlFor={titleId} className="mt-4 block text-[14px] font-bold">
        {isMilestone ? "What did you reach?" : "What did you decide?"}
      </label>
      <input
        id={titleId}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        required
        className={fieldClass}
        placeholder={isMilestone ? "First paying customer" : "Dropped the B2C version"}
      />

      <label htmlFor={dateId} className="mt-4 block text-[14px] font-bold">
        {isMilestone ? "When did it happen?" : "When did you decide?"}
      </label>
      <input id={dateId} type="date" value={on} max={today()} onChange={(e) => setOn(e.target.value)} required className={`${fieldClass} min-h-[48px]`} />

      <label htmlFor={learnedId} className="mt-4 block text-[14px] font-bold">
        What did you learn? <span className="font-normal text-ink3">(optional)</span>
      </label>
      <textarea
        id={learnedId}
        value={learned}
        onChange={(e) => setLearned(e.target.value)}
        rows={3}
        maxLength={1200}
        className={`${fieldClass} resize-y`}
        placeholder={isMilestone ? "What getting here taught you" : "Why you chose this, and what you gave up"}
      />

      <ActionError message={error} />
      <button type="submit" disabled={saving || !title.trim() || !on} className={buttonClass("primary", "mt-4 w-auto px-6")}>
        {saving ? "Saving…" : isMilestone ? "Add milestone" : "Add decision"}
      </button>
    </form>
  );
}

/** C2 + C3 · Journey: milestones, decisions and saved reflections, newest first. */
export function JourneyRoom({ founderId }: { founderId: string }) {
  const q = useLoad(() => api.journey(founderId), founderId);
  const audience = useAudience(founderId, "journey");
  const [filter, setFilter] = useState<Filter>("all");
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(item: JourneyItem) {
    setRemoving(item.id);
    setError(null);
    try {
      q.setData(await api.deleteJourney(item.id, founderId));
    } catch (err) {
      setError(`Couldn't remove that. ${errorMessage(err)}`);
    } finally {
      setRemoving(null);
    }
  }

  if (!q.data) {
    return (
      <AppShell>
        <RoomWaiting title={TITLE} audience={audience} error={q.error} retry={q.retry} waiting="Opening your Journey…" />
      </AppShell>
    );
  }

  const items = q.data.filter((i) => filter === "all" || i.kind === filter);

  return (
    <AppShell>
      <RoomHeader title={TITLE} audience={audience} sub="The moments that shaped what you're building, newest first." />

      <details className="group mt-5 rounded-[16px] border border-rule bg-card">
        <summary
          className={`flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 rounded-[16px] px-5 text-[15px] font-bold [&::-webkit-details-marker]:hidden ${focus}`}
        >
          Add to your Journey
          <span aria-hidden className="text-[20px] leading-none text-ember-deep transition-transform group-open:rotate-45">
            +
          </span>
        </summary>
        <AddForm
          founderId={founderId}
          onSaved={(list) => {
            q.setData(list);
            setFilter("all");
          }}
        />
      </details>

      <div role="group" aria-label="Show" className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`min-h-[44px] rounded-full border px-4 text-[13.5px] font-semibold ${filter === f.value ? "border-ink bg-ink text-cream" : "border-rule bg-card text-ink2 hover:border-ink"} ${focus}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ActionError message={error} />

      {items.length === 0 ? (
        <p className="mt-5 text-[14.5px] text-ink3">
          {filter === "all" ? "Nothing here yet. Add your first milestone or decision above." : "Nothing of this kind yet."}
        </p>
      ) : (
        <ol className="mt-5 border-l-2 border-rule pl-5">
          {items.map((it) => (
            <li key={it.id} className="relative pb-6 last:pb-0">
              <span
                aria-hidden
                className={`absolute top-1.5 -left-[27px] h-3 w-3 rounded-full ring-4 ring-screen ${it.kind === "milestone" ? "bg-ember" : it.kind === "decision" ? "bg-espresso" : "bg-dust"}`}
              />
              <div className="rounded-[16px] border border-rule bg-card p-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink3">
                  {KIND_WORD[it.kind]} · <time dateTime={it.on}>{dayText(it.on)}</time>
                </p>
                <h2 className="mt-1 text-[16px] font-bold leading-snug">{it.title}</h2>
                {it.source === "daily_brew" ? <p className="mt-0.5 text-[12.5px] text-ink3">From the Daily Brew</p> : null}
                {it.source === "idea_district" ? <p className="mt-0.5 text-[12.5px] text-ink3">Recorded by Idea District</p> : null}
                {it.source === "simulator" ? <p className="mt-0.5 text-[12.5px] text-ink3">From Test an assumption</p> : null}
                {it.learned ? (
                  <div className="mt-3">
                    <p className="text-[12px] font-bold text-ink2">{it.kind === "reflection" ? "What you wrote" : it.kind === "simulation" ? "What you chose" : "What you learned"}</p>
                    <p className="mt-0.5 whitespace-pre-line text-[14.5px] leading-relaxed">{it.learned}</p>
                  </div>
                ) : null}
                {it.removable ? (
                  <div className="mt-2 -mb-2 flex justify-end">
                    <ConfirmButton label="Delete" confirmLabel="Yes, delete it" what={it.title} busy={removing === it.id} onConfirm={() => void remove(it)} />
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </AppShell>
  );
}
