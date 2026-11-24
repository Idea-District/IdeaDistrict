"use client";

import { useState, type FormEvent } from "react";

import type { CafeTable, CafeTableStatus } from "@idea-district/api-client";

import { buttonClass, ErrorNotice } from "@/components/ui";

import { Card, Field, inputClass, localToIso, Pill, Saved, smallButton, useAdminAction, whenLabel } from "./parts";

const STATUS_PILL: Record<CafeTableStatus, { label: string; tone: "forest" | "tint" | "muted" }> = {
  open: { label: "Open", tone: "forest" },
  scheduled: { label: "Scheduled", tone: "tint" },
  closed: { label: "Closed", tone: "muted" },
};

const ACTIONS: { status: CafeTableStatus; label: string }[] = [
  { status: "open", label: "Open" },
  { status: "scheduled", label: "Schedule" },
  { status: "closed", label: "Close" },
];

/** Open Tables: topic conversations the team opens, schedules and closes. */
export function TablesSection({ tables }: { tables: CafeTable[] }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <TableList tables={tables} />
      <AddTable />
    </div>
  );
}

function TableList({ tables }: { tables: CafeTable[] }) {
  const { busy, error, run } = useAdminAction();

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[18px] font-bold">Tables</h2>
        <p className="text-[13px] text-ink3">{tables.filter((t) => t.status === "open").length} open now</p>
      </div>
      {error ? (
        <div className="mt-3">
          <ErrorNotice message={error} />
        </div>
      ) : null}
      {tables.length === 0 ? (
        <p className="mt-4 text-[14.5px] text-ink2">No tables yet. Add the first one.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {tables.map((t) => {
            const pill = STATUS_PILL[t.status];
            const starts = whenLabel(t.starts_at);
            return (
              <li key={t.id} className={`rounded-[12px] border border-rule p-3.5 ${t.status === "closed" ? "bg-screen/60" : ""}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={pill.tone}>{pill.label}</Pill>
                  <h3 className={`text-[15.5px] font-bold ${t.status === "closed" ? "text-ink2" : "text-ink"}`}>{t.title}</h3>
                </div>
                <p className="mt-1.5 text-[14px] leading-snug text-ink2">{t.prompt}</p>
                <p className="mt-2 text-[12.5px] text-ink3">
                  {t.seated_count} seated · {t.post_count} {t.post_count === 1 ? "post" : "posts"} · {starts ? `Starts ${starts}` : "No start time"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={`Change status of ${t.title}`}>
                  {ACTIONS.filter((a) => a.status !== t.status).map((a) => (
                    <button
                      key={a.status}
                      type="button"
                      className={smallButton(a.status === "open" ? "dark" : "secondary")}
                      disabled={busy !== null}
                      onClick={() => run(`${t.id}:${a.status}`, (c) => c.setTableStatus(t.id, a.status))}
                    >
                      {busy === `${t.id}:${a.status}` ? "Saving…" : a.label}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function AddTable() {
  const { busy, error, run } = useAdminAction();
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const saving = busy !== null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaved(null);
    const iso = localToIso(startsAt);
    const res = await run("add", (c) => c.addTable({ title: title.trim(), prompt: prompt.trim(), ...(iso ? { starts_at: iso } : {}) }));
    if (res) {
      setTitle("");
      setPrompt("");
      setStartsAt("");
      setSaved(res.status === "scheduled" ? "Table added and scheduled." : "Table added and open now.");
    }
  }

  return (
    <Card>
      <h2 className="text-[18px] font-bold">Add a table</h2>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
        <fieldset disabled={saving} className="flex flex-col gap-4">
          <Field label="Title">
            {(p) => <input {...p} required minLength={3} maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />}
          </Field>
          <Field label="Pinned prompt" hint="Shown at the top of the table. 8 to 600 characters.">
            {(p) => (
              <textarea
                {...p}
                required
                minLength={8}
                maxLength={600}
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className={`${inputClass} resize-y`}
              />
            )}
          </Field>
          <Field label="Start time" optional hint="Empty = open now. A future start schedules it.">
            {(p) => <input {...p} type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputClass} />}
          </Field>
        </fieldset>
        {error ? <ErrorNotice message={error} /> : null}
        {saved ? <Saved>{saved}</Saved> : null}
        <button type="submit" className={buttonClass("primary")} disabled={saving}>
          {saving ? "Adding…" : "Add table"}
        </button>
      </form>
    </Card>
  );
}
