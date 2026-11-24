"use client";

import { useId, useState, type FormEvent } from "react";

import type { BusinessField, StateEntry } from "@idea-district/api-client";

import { AppShell, buttonClass } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useLoad } from "@/features/cafe/shared";

import { ActionError, fieldClass, linkClass, RoomHeader, RoomWaiting, useAudience } from "./rooms";

const TITLE = "Business";

/** Declared (or confirmed) by the founder vs worked out by the system. */
function isFounders(s: StateEntry) {
  return s.source === "declared" || s.source === "validated";
}

function SourceTag({ entry }: { entry: StateEntry }) {
  return isFounders(entry) ? (
    <span className="text-[12px] font-semibold text-ink3">You told us</span>
  ) : (
    <span className="inferred text-[12px]">We worked this out</span>
  );
}

function FieldRow({
  label,
  entry,
  onSave,
}: {
  label: string;
  entry: StateEntry | undefined;
  onSave: (value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(value.trim());
      setEditing(false);
    } catch (err) {
      setError(`Couldn't save that. ${errorMessage(err)}`);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <li className="py-4">
        <form onSubmit={submit}>
          <label htmlFor={inputId} className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink3">
            {label}
          </label>
          <input id={inputId} value={value} onChange={(e) => setValue(e.target.value)} maxLength={300} autoFocus className={fieldClass} />
          <ActionError message={error} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="submit" disabled={saving || !value.trim()} className={buttonClass("primary", "w-auto px-5")}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className={buttonClass("ghost", "w-auto px-4")}>
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-3 py-4">
      <div className="min-w-0">
        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink3">{label}</p>
        {entry ? (
          <>
            <p className={`mt-1 text-[15.5px] leading-snug ${isFounders(entry) ? "" : "inferred"}`}>{entry.value}</p>
            <p className="mt-1">
              <SourceTag entry={entry} />
            </p>
          </>
        ) : (
          <p className="mt-1 text-[15px] text-ink3">Not set yet</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          setValue(entry?.value ?? "");
          setError(null);
          setEditing(true);
        }}
        className={`${linkClass} shrink-0`}
        aria-label={`${entry ? "Edit" : "Add"} ${label.toLowerCase()}`}
      >
        {entry ? "Edit" : "Add"}
      </button>
    </li>
  );
}

/** C4 · Business: the founder's current State, one row per field, editable in place. */
export function BusinessRoom({ founderId }: { founderId: string }) {
  const q = useLoad(() => api.business(founderId), founderId);
  const audience = useAudience(founderId, "business");

  if (!q.data) {
    return (
      <AppShell>
        <RoomWaiting title={TITLE} audience={audience} error={q.error} retry={q.retry} waiting="Opening your Business room…" />
      </AppShell>
    );
  }

  const { items, fields } = q.data;
  // The newest current entry wins if a field has more than one.
  const current = (field: BusinessField) => [...items].reverse().find((s) => s.field === field);

  async function save(field: BusinessField, value: string) {
    q.setData(await api.setBusiness(founderId, field, value));
  }

  return (
    <AppShell>
      <RoomHeader title={TITLE} audience={audience} />

      <section className="mt-5 rounded-[16px] bg-espresso p-5 text-cream">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ember-light">State · what&rsquo;s happening now</p>
        <p className="mt-1.5 text-[15px] leading-relaxed">When this changes, your introductions change too.</p>
      </section>

      <ul className="mt-5 divide-y divide-rule rounded-[16px] border border-rule bg-card px-5">
        {fields.map((f) => (
          <FieldRow key={f.field} label={f.label} entry={current(f.field)} onSave={(v) => save(f.field, v)} />
        ))}
      </ul>
      <p className="mt-3 text-[13px] text-ink3">Your edits are kept when your ID is rebuilt.</p>
    </AppShell>
  );
}
