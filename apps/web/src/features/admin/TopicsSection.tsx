"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { buttonClass, CalmState, ErrorNotice } from "@/components/ui";
import { adminErrorMessage, isAuthError, type AdminTopic, type TopicCategory } from "@/lib/adminApi";

import { Card, Field, inputClass, Pill, Saved, smallButton, useAdmin, useAdminAction } from "./parts";

const CATEGORIES: { value: TopicCategory; label: string }[] = [
  { value: "market", label: "Market" },
  { value: "business_model", label: "Business model" },
];
const categoryLabel = (c: TopicCategory) => CATEGORIES.find((x) => x.value === c)?.label ?? c;

const MAX_SECTIONS = 8;
const MAX_QUESTIONS = 6;

export type TopicsState = {
  topics: AdminTopic[] | null;
  error: string | null;
  /** Refetches the list of reads; never throws. */
  reload: () => Promise<void>;
};

/** Loads the Explore industries reads. They are not part of the Cafe overview, so the tab fetches them itself. */
export function useTopics(): TopicsState {
  const { client, onAuthLost } = useAdmin();
  const [topics, setTopics] = useState<AdminTopic[] | null>(null);
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
      setTopics(await client.listTopics());
      setError(null);
    } catch (e) {
      fail(e);
    }
  }, [client, fail]);

  // First load for each client; later changes call reload() directly.
  useEffect(() => {
    let live = true;
    client.listTopics().then(
      (next) => {
        if (!live) return;
        setTopics(next);
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

  return { topics, error, reload };
}

/** Industry reads: the Explore industries reads founders see, written by the team. */
export function TopicsSection({ state }: { state: TopicsState }) {
  const { topics, error, reload } = state;

  if (!topics)
    return error ? (
      <div className="mx-auto w-full max-w-[480px]">
        <ErrorNotice message={error} onRetry={() => void reload()} />
      </div>
    ) : (
      <CalmState title="Loading industry reads" />
    );

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex flex-col gap-4">
        {error ? <ErrorNotice message={`Couldn't refresh: ${error}`} onRetry={() => void reload()} /> : null}
        <TopicList topics={topics} reload={reload} />
      </div>
      <AddTopic reload={reload} />
    </div>
  );
}

function TopicList({ topics, reload }: { topics: AdminTopic[]; reload: () => Promise<void> }) {
  const { busy, error, run } = useAdminAction();
  const [confirming, setConfirming] = useState<string | null>(null);
  const live = topics.filter((t) => !t.archived).length;

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[18px] font-bold">Reads</h2>
        <p className="text-[13px] text-ink3">
          {live} live · archived reads leave Explore industries
        </p>
      </div>

      {error ? (
        <div className="mt-3">
          <ErrorNotice message={error} />
        </div>
      ) : null}

      {topics.length === 0 ? (
        <p className="mt-4 text-[14.5px] text-ink2">No reads yet. Write the first one.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {topics.map((t) => {
            const tags = t.tags
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean);
            return (
              <li
                key={t.slug}
                className={`flex flex-col gap-3 rounded-[12px] p-3.5 sm:flex-row sm:items-start ${
                  t.archived ? "border border-rule bg-screen/60" : "border border-rule"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={t.category === "market" ? "plain" : "tint"}>{categoryLabel(t.category)}</Pill>
                    {t.archived ? <Pill tone="muted">Archived</Pill> : null}
                  </div>
                  <h3 className={`mt-1.5 text-[15.5px] font-bold leading-snug ${t.archived ? "text-ink2" : ""}`}>{t.title}</h3>
                  <p className="mt-1.5 text-[12.5px] text-ink3">
                    {t.minutes} min read
                    {tags.length ? ` · ${tags.join(", ")}` : " · No tags"}
                  </p>
                </div>
                {!t.archived ? (
                  <div className="flex shrink-0 gap-2 self-start">
                    {confirming === t.slug ? (
                      <>
                        <button
                          type="button"
                          className={smallButton("danger")}
                          disabled={busy !== null}
                          onClick={async () => {
                            await run(
                              t.slug,
                              async (c) => {
                                await c.archiveTopic(t.slug);
                                await reload();
                              },
                              { refresh: false },
                            );
                            setConfirming(null);
                          }}
                        >
                          {busy === t.slug ? "Archiving…" : "Confirm archive"}
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
                        onClick={() => setConfirming(t.slug)}
                        aria-label={`Archive ${t.title}`}
                      >
                        Archive
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

type SectionDraft = { key: string; heading: string; body: string };
const newSection = (): SectionDraft => ({ key: crypto.randomUUID(), heading: "", body: "" });

function AddTopic({ reload }: { reload: () => Promise<void> }) {
  const { busy, error, run } = useAdminAction();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TopicCategory>("market");
  const [minutes, setMinutes] = useState(3);
  const [summary, setSummary] = useState("");
  const [sections, setSections] = useState<SectionDraft[]>(() => [newSection()]);
  const [questions, setQuestions] = useState("");
  const [tags, setTags] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const saving = busy !== null;

  const questionList = questions
    .split("\n")
    .map((q) => q.trim())
    .filter(Boolean);
  const tooManyQuestions = questionList.length > MAX_QUESTIONS;

  function updateSection(key: string, patch: Partial<SectionDraft>) {
    setSections((all) => all.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaved(null);
    if (tooManyQuestions) return;
    const res = await run(
      "add",
      async (c) => {
        const out = await c.addTopic({
          title: title.trim(),
          category,
          minutes,
          summary: summary.trim(),
          sections: sections.map((s) => ({ heading: s.heading.trim(), body: s.body.trim() })),
          questions: questionList,
          tags: tags.trim(),
        });
        await reload();
        return out;
      },
      { refresh: false },
    );
    if (res) {
      setSaved(`Published "${title.trim()}".`);
      setTitle("");
      setCategory("market");
      setMinutes(3);
      setSummary("");
      setSections([newSection()]);
      setQuestions("");
      setTags("");
    }
  }

  return (
    <Card>
      <h2 className="text-[18px] font-bold">Add a read</h2>
      <p className="mt-1.5 rounded-[10px] bg-sand2 px-3 py-2 text-[13.5px] font-semibold text-ink">
        Write patterns to check, not statistics. No numbers you can&apos;t source.
      </p>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
        <fieldset disabled={saving} className="flex flex-col gap-4">
          <Field label="Title" hint="4 to 160 characters.">
            {(p) => (
              <input {...p} required minLength={4} maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
            )}
          </Field>
          <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
            <Field label="Category">
              {(p) => (
                <select {...p} value={category} onChange={(e) => setCategory(e.target.value as TopicCategory)} className={inputClass}>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Minutes">
              {(p) => (
                <input
                  {...p}
                  type="number"
                  required
                  min={1}
                  max={15}
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  className={inputClass}
                />
              )}
            </Field>
          </div>
          <Field label="Summary" hint="10 to 400 characters. Shown on the card in Explore industries.">
            {(p) => (
              <textarea
                {...p}
                required
                minLength={10}
                maxLength={400}
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className={`${inputClass} resize-y`}
              />
            )}
          </Field>

          <div className="flex flex-col gap-3">
            <p className="text-[13.5px] font-bold text-ink">
              Sections <span className="font-semibold text-ink3">(1 to {MAX_SECTIONS})</span>
            </p>
            {sections.map((s, i) => (
              <div key={s.key} className="flex flex-col gap-3 rounded-[12px] border border-rule p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-bold text-ink3">Section {i + 1}</p>
                  {sections.length > 1 ? (
                    <button
                      type="button"
                      className={smallButton()}
                      onClick={() => setSections((all) => all.filter((x) => x.key !== s.key))}
                      aria-label={`Remove section ${i + 1}`}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <Field label="Heading">
                  {(p) => (
                    <input
                      {...p}
                      required
                      minLength={2}
                      maxLength={120}
                      value={s.heading}
                      onChange={(e) => updateSection(s.key, { heading: e.target.value })}
                      className={inputClass}
                    />
                  )}
                </Field>
                <Field label="Body" hint="10 to 2000 characters.">
                  {(p) => (
                    <textarea
                      {...p}
                      required
                      minLength={10}
                      maxLength={2000}
                      rows={4}
                      value={s.body}
                      onChange={(e) => updateSection(s.key, { body: e.target.value })}
                      className={`${inputClass} resize-y`}
                    />
                  )}
                </Field>
              </div>
            ))}
            {sections.length < MAX_SECTIONS ? (
              <button type="button" className={smallButton("secondary", "self-start")} onClick={() => setSections((all) => [...all, newSection()])}>
                Add section
              </button>
            ) : null}
          </div>

          <Field label="Questions to ask yourself" optional hint={`One per line, up to ${MAX_QUESTIONS}.`}>
            {(p) => (
              <textarea
                {...p}
                rows={4}
                value={questions}
                aria-invalid={tooManyQuestions || undefined}
                onChange={(e) => setQuestions(e.target.value)}
                className={`${inputClass} resize-y`}
              />
            )}
          </Field>
          {tooManyQuestions ? (
            <ErrorNotice message={`That's ${questionList.length} questions. Keep it to ${MAX_QUESTIONS} or fewer.`} />
          ) : null}
          <Field
            label="Tags"
            optional
            hint="Keywords that match a founder's District, e.g. pricing, food, kirana. Used for the For you filter."
          >
            {(p) => <input {...p} maxLength={300} value={tags} onChange={(e) => setTags(e.target.value)} className={inputClass} />}
          </Field>
        </fieldset>
        {error ? <ErrorNotice message={error} /> : null}
        {saved ? <Saved>{saved}</Saved> : null}
        <button type="submit" className={buttonClass("primary")} disabled={saving || tooManyQuestions}>
          {saving ? "Publishing…" : "Publish read"}
        </button>
      </form>
    </Card>
  );
}
