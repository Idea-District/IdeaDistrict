"use client";

import Link from "next/link";
import { useEffect, useId, useState, type FormEvent } from "react";

import type { BrewAnswer } from "@idea-district/api-client";

import { AppShell, CalmState, ErrorNotice, buttonClass } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

import { BackLink, Eyebrow, focus, PersonDot, postedText, useLoad } from "./shared";

/** B2 + B3 · Daily Brew: today's question, your answer, and what other founders said. */
export function DailyBrew({ founderId }: { founderId: string }) {
  const brewQ = useLoad(() => api.todaysBrew(founderId), `${founderId}`);
  const brew = brewQ.data?.brew ?? null;

  const [body, setBody] = useState("");
  const [toJourney, setToJourney] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [answers, setAnswers] = useState<BrewAnswer[] | null>(null);
  const [answersError, setAnswersError] = useState<string | null>(null);
  const fieldId = useId();
  const journeyId = useId();

  const brewId = brew?.id;
  useEffect(() => {
    if (!brewId) return;
    let live = true;
    api.brewAnswers(brewId, founderId).then(
      (a) => live && setAnswers(a),
      (e) => live && setAnswersError(errorMessage(e)),
    );
    return () => {
      live = false;
    };
  }, [brewId, founderId, brew?.answer_count]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!brew || body.trim().length < 2) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await api.answerBrew(brew.id, { founder_id: founderId, body, save_to_journey: toJourney });
      brewQ.setData({ brew: updated });
      setEditing(false);
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleHelpful(a: BrewAnswer) {
    const on = !a.helpful_by_me;
    setAnswers((list) => list?.map((x) => (x.id === a.id ? { ...x, helpful_by_me: on, helpful_count: x.helpful_count + (on ? 1 : -1) } : x)) ?? null);
    try {
      const r = await api.markHelpful(a.id, founderId, on);
      setAnswers((list) => list?.map((x) => (x.id === a.id ? { ...x, ...r } : x)) ?? null);
    } catch (err) {
      setAnswersError(errorMessage(err));
    }
  }

  if (!brewQ.data) {
    return (
      <AppShell>
        <BackLink href="/cafe" label="Cafe" />
        {brewQ.error ? <ErrorNotice message={brewQ.error} onRetry={brewQ.retry} /> : <CalmState title="Pouring today's brew…" />}
      </AppShell>
    );
  }

  if (!brew) {
    return (
      <AppShell>
        <BackLink href="/cafe" label="Cafe" />
        <Eyebrow>Daily Brew</Eyebrow>
        <h1 className="mt-1 text-[26px] font-bold">No question today.</h1>
        <p className="mt-2 text-[15px] text-ink2">A new Daily Brew goes up tomorrow morning.</p>
      </AppShell>
    );
  }

  const answered = !!brew.my_answer && !editing;
  const others = answers?.filter((a) => !a.mine) ?? [];

  return (
    <AppShell>
      <BackLink href="/cafe" label="Cafe" />
      <Eyebrow>Today&rsquo;s Daily Brew</Eyebrow>

      <section className="relative mt-3 overflow-hidden rounded-[16px] bg-espresso p-5 text-cream lg:p-6">
        <span aria-hidden className="pixel absolute top-4 right-5 h-3 w-3" />
        <h1 className="max-w-[30ch] text-[22px] font-bold leading-snug lg:text-[26px]">{brew.question}</h1>
        <p className="mt-3 text-[13px] text-cream/75">
          {brew.answer_count} {brew.answer_count === 1 ? "founder has" : "founders have"} answered
        </p>
      </section>

      {answered ? (
        <section className="mt-5 rounded-[16px] border border-rule bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink3">Your answer</p>
            <button
              type="button"
              onClick={() => {
                setBody(brew.my_answer!.body);
                setToJourney(brew.my_answer!.save_to_journey);
                setEditing(true);
              }} className={`min-h-[44px] rounded px-2 text-[14px] font-semibold text-ink2 underline underline-offset-4 hover:text-ink ${focus}`}>
              Edit
            </button>
          </div>
          <p className="mt-1 whitespace-pre-line text-[15.5px] leading-relaxed">{brew.my_answer!.body}</p>
          <p className="mt-3 text-[13px] text-ink3">
            {brew.my_answer!.save_to_journey ? "Also saved to your Journey." : "Not saved to your Journey."}
          </p>
        </section>
      ) : (
        <form onSubmit={submit} className="mt-5 rounded-[16px] border border-rule bg-card p-5">
          <label htmlFor={fieldId} className="text-[14px] font-bold">
            Your answer
          </label>
          <p className="text-[13px] text-ink3">Two or three sentences is plenty. Other founders will see it with your name.</p>
          <textarea
            id={fieldId}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            maxLength={1200}
            className="mt-3 w-full resize-y rounded-[12px] border border-rule bg-screen px-4 py-3 text-[15px] leading-relaxed focus:border-ink focus:outline-none"
            placeholder="What happened, and what did you take from it?"
          />
          <div className="mt-3 flex items-start gap-3">
            <input
              id={journeyId}
              type="checkbox"
              checked={toJourney}
              onChange={(e) => setToJourney(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#191919]"
            />
            <label htmlFor={journeyId} className="text-[14px] leading-snug">
              Also save to My Journey
              <span className="block text-[12.5px] text-ink3">Only you see your Journey.</span>
            </label>
          </div>
          {saveError ? (
            <p role="alert" className="mt-3 text-[13.5px] text-ember-deep">
              {saveError}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" disabled={saving || body.trim().length < 2} className={buttonClass("primary", "w-auto px-6")}>
              {saving ? "Posting…" : brew.my_answer ? "Save changes" : "Post my answer"}
            </button>
            {editing ? (
              <button type="button" onClick={() => setEditing(false)} className={buttonClass("ghost", "w-auto px-4")}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      )}

      <section className="mt-8" aria-labelledby="others">
        <h2 id="others" className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink3">
          What other founders said
        </h2>
        {answersError ? <p className="mt-2 text-[13.5px] text-ember-deep">{answersError}</p> : null}
        {answers && others.length === 0 ? <p className="mt-3 text-[14.5px] text-ink3">No one else yet. You could be first.</p> : null}
        <ul className="mt-3 flex flex-col gap-3">
          {others.map((a) => (
            <li key={a.id} className="rounded-[16px] border border-rule bg-card p-4">
              <div className="flex items-center gap-3">
                <PersonDot person={a.author} />
                <div className="min-w-0">
                  <p className="text-[14.5px] font-bold">{a.author.name}</p>
                  <p className="truncate text-[12.5px] text-ink3">
                    {a.author.building ? `${a.author.building} · ` : ""}
                    {postedText(a.posted_at)}
                  </p>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed">{a.body}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={a.helpful_by_me}
                  onClick={() => void toggleHelpful(a)}
                  className={`min-h-[40px] rounded-full border px-4 text-[13.5px] font-semibold ${a.helpful_by_me ? "border-ink bg-ink text-cream" : "border-rule bg-screen hover:border-ink"} ${focus}`}
                >
                  Helpful{a.helpful_count ? ` · ${a.helpful_count}` : ""}
                </button>
                <Link href="/ask" className={`flex min-h-[40px] items-center rounded-full bg-ember-tint px-4 text-[13.5px] font-semibold hover:bg-ember ${focus}`}>
                  Ask ID about this
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
