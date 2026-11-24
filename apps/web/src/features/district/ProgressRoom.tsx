"use client";

import { useId, useState, type FormEvent } from "react";

import type { ExperimentItem, ExperimentStatus } from "@idea-district/api-client";

import { AppShell, buttonClass } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { focus, useLoad } from "@/features/cafe/shared";

import { ActionError, dayText, fieldClass, linkClass, RoomHeader, RoomWaiting, today, useAudience } from "./rooms";

const TITLE = "Progress";
const STATUS_WORD: Record<ExperimentStatus, string> = { running: "Running", done: "Done", stopped: "Stopped" };

function dates(e: ExperimentItem) {
  if (e.status === "running") return `Started ${dayText(e.started_on)}`;
  return `${dayText(e.started_on)} to ${dayText(e.ended_on)}`;
}

function Detail({ label, text }: { label: string; text: string }) {
  if (!text) return null;
  return (
    <div className="mt-3">
      <p className="text-[12px] font-bold text-ink2">{label}</p>
      <p className="mt-0.5 whitespace-pre-line text-[14.5px] leading-relaxed">{text}</p>
    </div>
  );
}

function Details({ e }: { e: ExperimentItem }) {
  return (
    <>
      <Detail label="What you tried" text={e.tried} />
      <Detail label="What happened" text={e.happened} />
      <Detail label="What you learned" text={e.learned} />
    </>
  );
}

function RecordForm({
  exp,
  onSave,
  onCancel,
}: {
  exp: ExperimentItem;
  onSave: (input: { happened: string; learned: string; status: ExperimentStatus }) => Promise<void>;
  onCancel: () => void;
}) {
  const [happened, setHappened] = useState(exp.happened);
  const [learned, setLearned] = useState(exp.learned);
  const [saving, setSaving] = useState<ExperimentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hId = useId();
  const lId = useId();

  async function save(status: ExperimentStatus) {
    setSaving(status);
    setError(null);
    try {
      await onSave({ happened: happened.trim(), learned: learned.trim(), status });
    } catch (err) {
      setError(`Couldn't save that. ${errorMessage(err)}`);
      setSaving(null);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void save("running");
  }

  return (
    <form onSubmit={submit} className="mt-4 border-t border-rule pt-4">
      <label htmlFor={hId} className="block text-[14px] font-bold">
        What happened?
      </label>
      <textarea id={hId} value={happened} onChange={(e) => setHappened(e.target.value)} rows={3} maxLength={1200} className={`${fieldClass} resize-y`} />
      <label htmlFor={lId} className="mt-3 block text-[14px] font-bold">
        What did you learn?
      </label>
      <textarea id={lId} value={learned} onChange={(e) => setLearned(e.target.value)} rows={3} maxLength={1200} className={`${fieldClass} resize-y`} />
      <ActionError message={error} />
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={!!saving} onClick={() => void save("done")} className={buttonClass("primary", "w-auto px-5")}>
          {saving === "done" ? "Saving…" : "Mark as done"}
        </button>
        <button type="button" disabled={!!saving} onClick={() => void save("stopped")} className={buttonClass("secondary", "w-auto px-5")}>
          {saving === "stopped" ? "Saving…" : "Stop it"}
        </button>
        <button type="submit" disabled={!!saving} className={buttonClass("secondary", "w-auto px-5")}>
          {saving === "running" ? "Saving…" : "Save, still running"}
        </button>
        <button type="button" onClick={onCancel} className={buttonClass("ghost", "w-auto px-4")}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function AddForm({ founderId, onSaved }: { founderId: string; onSaved: (items: ExperimentItem[]) => void }) {
  const [title, setTitle] = useState("");
  const [tried, setTried] = useState("");
  const [started, setStarted] = useState(today());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tId = useId();
  const trId = useId();
  const dId = useId();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim() || !started) return;
    setSaving(true);
    setError(null);
    try {
      onSaved(await api.addExperiment({ founder_id: founderId, title: title.trim(), tried: tried.trim(), started_on: started }));
      setTitle("");
      setTried("");
      setStarted(today());
      (e.target as HTMLFormElement).closest("details")?.removeAttribute("open");
    } catch (err) {
      setError(`Couldn't save that. ${errorMessage(err)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="px-5 pb-5">
      <label htmlFor={tId} className="block text-[14px] font-bold">
        Name it
      </label>
      <input id={tId} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required className={fieldClass} placeholder="Charging for onboarding" />
      <label htmlFor={trId} className="mt-4 block text-[14px] font-bold">
        What are you trying?
      </label>
      <textarea id={trId} value={tried} onChange={(e) => setTried(e.target.value)} rows={3} maxLength={1200} className={`${fieldClass} resize-y`} placeholder="What you're changing, and what you expect" />
      <label htmlFor={dId} className="mt-4 block text-[14px] font-bold">
        Start date
      </label>
      <input id={dId} type="date" value={started} onChange={(e) => setStarted(e.target.value)} required className={`${fieldClass} min-h-[48px]`} />
      <ActionError message={error} />
      <button type="submit" disabled={saving || !title.trim() || !started} className={buttonClass("primary", "mt-4 w-auto px-6")}>
        {saving ? "Saving…" : "Add experiment"}
      </button>
    </form>
  );
}

/** C6 · Progress: experiments, running first; finished ones fold away. */
export function ProgressRoom({ founderId }: { founderId: string }) {
  const q = useLoad(() => api.experiments(founderId), founderId);
  const audience = useAudience(founderId, "progress");
  const [recording, setRecording] = useState<string | null>(null);

  if (!q.data) {
    return (
      <AppShell>
        <RoomWaiting title={TITLE} audience={audience} error={q.error} retry={q.retry} waiting="Opening your Progress room…" />
      </AppShell>
    );
  }

  const running = q.data.filter((e) => e.status === "running");
  const finished = q.data.filter((e) => e.status !== "running");

  return (
    <AppShell>
      <RoomHeader title={TITLE} audience={audience} sub="What you're trying, what happened, and what you learned." />

      <details className="group mt-5 rounded-[16px] border border-rule bg-card">
        <summary
          className={`flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 rounded-[16px] px-5 text-[15px] font-bold [&::-webkit-details-marker]:hidden ${focus}`}
        >
          Add an experiment
          <span aria-hidden className="text-[20px] leading-none text-ember-deep transition-transform group-open:rotate-45">
            +
          </span>
        </summary>
        <AddForm founderId={founderId} onSaved={q.setData} />
      </details>

      <h2 className="mt-8 text-[12px] font-bold uppercase tracking-[0.12em] text-ink3">Running</h2>
      {running.length === 0 ? <p className="mt-2 text-[14.5px] text-ink3">Nothing running right now.</p> : null}
      <ul className="mt-3 flex flex-col gap-3">
        {running.map((e) => (
          <li key={e.id} className="rounded-[16px] border border-rule bg-card p-4">
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ember-deep">{STATUS_WORD[e.status]}</p>
            <h3 className="mt-1 text-[16px] font-bold leading-snug">{e.title}</h3>
            <p className="mt-0.5 text-[12.5px] text-ink3">{dates(e)}</p>
            <Details e={e} />
            {recording === e.id ? (
              <RecordForm
                exp={e}
                onCancel={() => setRecording(null)}
                onSave={async (input) => {
                  q.setData(await api.updateExperiment(e.id, { founder_id: founderId, ...input }));
                  setRecording(null);
                }}
              />
            ) : (
              <div className="mt-2 -mb-2">
                <button type="button" onClick={() => setRecording(e.id)} className={linkClass}>
                  Record what happened
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {finished.length ? (
        <>
          <h2 className="mt-8 text-[12px] font-bold uppercase tracking-[0.12em] text-ink3">Done or stopped</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {finished.map((e) => (
              <li key={e.id}>
                <details className="group rounded-[16px] border border-rule bg-card">
                  <summary
                    className={`flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 rounded-[16px] px-4 py-3 [&::-webkit-details-marker]:hidden ${focus}`}
                  >
                    <span className="min-w-0">
                      <span className="block text-[15px] font-bold leading-snug">{e.title}</span>
                      <span className="block text-[12.5px] text-ink3">
                        {STATUS_WORD[e.status]} · {dates(e)}
                      </span>
                    </span>
                    <span aria-hidden className="text-ink3 transition-transform group-open:rotate-90">
                      ›
                    </span>
                  </summary>
                  <div className="px-4 pb-4">
                    <Details e={e} />
                    {!e.tried && !e.happened && !e.learned ? <p className="text-[14px] text-ink3">No notes recorded.</p> : null}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </AppShell>
  );
}
