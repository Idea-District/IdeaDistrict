"use client";

import { useState, type FormEvent } from "react";

import type { AdminBrew } from "@idea-district/api-client";

import { buttonClass, ErrorNotice, IdMark, Label } from "@/components/ui";

import { Card, dayLabel, Field, inputClass, Pill, Saved, smallButton, useAdmin, useAdminAction } from "./parts";

/** Daily Brew: the schedule, a single add, and AI drafts the team approves one by one. */
export function BrewSection({ brews }: { brews: AdminBrew[] }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <BrewSchedule brews={brews} />
      <div className="flex flex-col gap-5">
        <AddBrew />
      </div>
      <div className="lg:col-span-2">
        <DraftWeek />
      </div>
    </div>
  );
}

function BrewSchedule({ brews }: { brews: AdminBrew[] }) {
  const { today } = useAdmin();
  const { busy, error, run } = useAdminAction();
  const [confirming, setConfirming] = useState<string | null>(null);
  const upcoming = brews.filter((b) => b.publish_on > today).length;

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[18px] font-bold">Schedule</h2>
        <p className="text-[13px] text-ink3">
          Last 7 days onward · {upcoming} still to go out
        </p>
      </div>

      {error ? (
        <div className="mt-3">
          <ErrorNotice message={error} />
        </div>
      ) : null}

      {brews.length === 0 ? (
        <p className="mt-4 text-[14.5px] text-ink2">No brews in the schedule. Add one, or draft a week with AI below.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {brews.map((b) => {
            const isToday = b.publish_on === today;
            const isFuture = b.publish_on > today;
            const isPast = b.publish_on < today;
            return (
              <li
                key={b.id}
                aria-current={isToday ? "date" : undefined}
                className={`flex flex-col gap-3 rounded-[12px] p-3.5 sm:flex-row sm:items-start ${
                  isToday ? "bg-espresso text-cream" : isPast ? "border border-rule bg-screen/60" : "border border-rule"
                }`}
              >
                <div className="w-[92px] shrink-0">
                  <p className={`text-[14px] font-bold ${isToday ? "text-cream" : isPast ? "text-ink3" : "text-ink"}`}>{dayLabel(b.publish_on)}</p>
                  {isToday ? (
                    <p className="mt-1">
                      <Pill tone="ember">Today</Pill>
                    </p>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[15px] leading-snug ${isToday ? "font-semibold" : isPast ? "text-ink2" : "text-ink"}`}>{b.question}</p>
                  <div className={`mt-2 flex flex-wrap items-center gap-2 text-[12.5px] ${isToday ? "text-cream/80" : "text-ink3"}`}>
                    {b.drafted_by_ai ? <Pill tone={isToday ? "muted" : "tint"}>AI draft</Pill> : null}
                    <span>
                      {b.answer_count} {b.answer_count === 1 ? "answer" : "answers"}
                    </span>
                  </div>
                </div>
                {isFuture ? (
                  <div className="flex shrink-0 gap-2 self-start">
                    {confirming === b.id ? (
                      <>
                        <button
                          type="button"
                          className={smallButton("danger")}
                          disabled={busy !== null}
                          onClick={async () => {
                            await run(b.id, (c) => c.deleteBrew(b.id));
                            setConfirming(null);
                          }}
                        >
                          {busy === b.id ? "Deleting…" : "Confirm delete"}
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
                        onClick={() => setConfirming(b.id)}
                        aria-label={`Delete the brew for ${dayLabel(b.publish_on)}`}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function AddBrew() {
  const { today } = useAdmin();
  const { busy, error, run } = useAdminAction();
  const [question, setQuestion] = useState("");
  const [date, setDate] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const saving = busy !== null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaved(null);
    const res = await run("add", (c) => c.addBrew({ question: question.trim(), ...(date ? { publish_on: date } : {}) }));
    if (res) {
      setQuestion("");
      setDate("");
      setSaved(`Scheduled for ${dayLabel(res.publish_on)}.`);
    }
  }

  return (
    <Card>
      <h2 className="text-[18px] font-bold">Add a brew</h2>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
        <fieldset disabled={saving} className="flex flex-col gap-4">
          <Field label="Question" hint="8 to 300 characters. One question founders can answer in a few lines.">
            {(p) => (
              <textarea
                {...p}
                required
                minLength={8}
                maxLength={300}
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className={`${inputClass} resize-y`}
              />
            )}
          </Field>
          <Field label="Date" optional hint="Empty = next free day">
            {(p) => <input {...p} type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />}
          </Field>
        </fieldset>
        {error ? <ErrorNotice message={error} /> : null}
        {saved ? <Saved>{saved}</Saved> : null}
        <button type="submit" className={buttonClass("primary")} disabled={saving}>
          {saving ? "Scheduling…" : "Schedule brew"}
        </button>
      </form>
    </Card>
  );
}

type Draft = { key: string; text: string };

function DraftWeek() {
  const drafting = useAdminAction();
  const scheduling = useAdminAction();
  const [theme, setTheme] = useState("");
  const [count, setCount] = useState(7);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [saved, setSaved] = useState<string | null>(null);
  const busy = drafting.busy !== null;

  async function draft(e: FormEvent) {
    e.preventDefault();
    setSaved(null);
    const res = await drafting.run("draft", (c) => c.draftBrews(count, theme.trim() || undefined), { refresh: false });
    if (res) setDrafts(res.questions.map((text) => ({ key: crypto.randomUUID(), text })));
  }

  async function schedule(d: Draft) {
    setSaved(null);
    const res = await scheduling.run(d.key, (c) => c.addBrew({ question: d.text.trim(), drafted_by_ai: true }));
    if (res) {
      setDrafts((all) => all.filter((x) => x.key !== d.key));
      setSaved(`Scheduled for ${dayLabel(res.publish_on)}.`);
    }
  }

  return (
    <Card>
      <div className="flex items-start gap-3">
        <IdMark size={22} className="mt-1" />
        <div>
          <h2 className="text-[18px] font-bold">Draft a week with AI</h2>
          <p className="mt-1 max-w-[62ch] text-[14px] text-ink2">
            ID suggests questions. Nothing is saved or sent to founders until you press Schedule on a draft. Each scheduled draft takes the next free day.
          </p>
        </div>
      </div>

      <form onSubmit={draft} className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px_auto] sm:items-end">
        <Field label="Theme" optional>
          {(p) => (
            <input
              {...p}
              value={theme}
              maxLength={200}
              disabled={busy}
              placeholder="e.g. pricing, first hires"
              onChange={(e) => setTheme(e.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        <Field label="How many">
          {(p) => (
            <select {...p} value={count} disabled={busy} onChange={(e) => setCount(Number(e.target.value))} className={inputClass}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          )}
        </Field>
        <button type="submit" className={buttonClass("dark", "sm:w-auto")} disabled={busy}>
          {busy ? "Drafting…" : drafts.length ? "Draft again" : "Draft with AI"}
        </button>
      </form>

      {drafting.error ? (
        <div className="mt-4">
          <ErrorNotice message={drafting.error} />
        </div>
      ) : null}
      {busy ? (
        <p role="status" className="mt-4 text-[14px] text-ink3">
          ID is drafting questions. This can take a few seconds.
        </p>
      ) : null}

      {drafts.length ? (
        <section aria-label="AI drafts" className="mt-5 rounded-[12px] border border-dashed border-ember-deep/50 bg-ember-tint/40 p-3.5 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Drafts · not scheduled</Label>
            <button type="button" className={smallButton()} disabled={scheduling.busy !== null} onClick={() => setDrafts([])}>
              Discard all
            </button>
          </div>
          {scheduling.error ? (
            <div className="mt-3">
              <ErrorNotice message={scheduling.error} />
            </div>
          ) : null}
          <ol className="mt-3 flex flex-col gap-3">
            {drafts.map((d, i) => (
              <li key={d.key} className="flex flex-col gap-2 rounded-[10px] bg-card p-3 sm:flex-row sm:items-start">
                <label htmlFor={`draft-${d.key}`} className="sr-only">
                  Draft {i + 1}
                </label>
                <span aria-hidden className="w-6 shrink-0 pt-2.5 text-[13px] font-bold text-ink3">
                  {i + 1}
                </span>
                <textarea
                  id={`draft-${d.key}`}
                  rows={2}
                  maxLength={300}
                  value={d.text}
                  disabled={scheduling.busy !== null}
                  onChange={(e) => setDrafts((all) => all.map((x) => (x.key === d.key ? { ...x, text: e.target.value } : x)))}
                  className={`${inputClass} min-w-0 flex-1 resize-y`}
                />
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className={smallButton("primary")}
                    disabled={scheduling.busy !== null || d.text.trim().length < 8}
                    onClick={() => schedule(d)}
                    aria-label={`Schedule draft ${i + 1}`}
                  >
                    {scheduling.busy === d.key ? "Scheduling…" : "Schedule"}
                  </button>
                  <button
                    type="button"
                    className={smallButton()}
                    disabled={scheduling.busy !== null}
                    onClick={() => setDrafts((all) => all.filter((x) => x.key !== d.key))}
                    aria-label={`Discard draft ${i + 1}`}
                  >
                    Discard
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {saved ? (
        <div className="mt-4">
          <Saved>{saved}</Saved>
        </div>
      ) : null}
    </Card>
  );
}
