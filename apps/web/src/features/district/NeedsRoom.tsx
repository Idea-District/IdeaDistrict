"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";

import type { NeedsRoom as NeedsData, StateEntry } from "@idea-district/api-client";

import { AppShell, buttonClass } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { focus, useLoad } from "@/features/cafe/shared";

import { ActionError, ConfirmButton, fieldClass, RoomHeader, RoomWaiting, useAudience } from "./rooms";

type Kind = keyof NeedsData;
const TITLE = "Needs & Aspirations";

const SECTIONS: { kind: Kind; title: string; note?: string; addLabel: string; placeholder: string }[] = [
  {
    kind: "need",
    title: "What would help most now",
    note: "Used to decide who ID introduces you to",
    addLabel: "Add something that would help",
    placeholder: "A warm intro to a hospital procurement lead",
  },
  { kind: "goal", title: "Where you're heading", addLabel: "Add where you're heading", placeholder: "Ten paying clinics by March" },
  {
    kind: "offer",
    title: "What you can offer other founders",
    addLabel: "Add something you can offer",
    placeholder: "Pricing reviews for B2B SaaS",
  },
];

function Section({
  title,
  note,
  addLabel,
  placeholder,
  items,
  onAdd,
  onRemove,
}: {
  title: string;
  note?: string;
  addLabel: string;
  placeholder: string;
  items: StateEntry[];
  onAdd: (value: string) => Promise<void>;
  onRemove: (entry: StateEntry) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const headingId = useId();
  const inputId = useId();

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onAdd(value.trim());
      setValue("");
    } catch (err) {
      setError(`Couldn't add that. ${errorMessage(err)}`);
    } finally {
      setSaving(false);
    }
  }

  async function remove(entry: StateEntry) {
    setRemoving(entry.id);
    setError(null);
    try {
      await onRemove(entry);
    } catch (err) {
      setError(`Couldn't remove that. ${errorMessage(err)}`);
    } finally {
      setRemoving(null);
    }
  }

  return (
    <section aria-labelledby={headingId} className="mt-6 rounded-[16px] border border-rule bg-card p-5">
      <h2 id={headingId} className="text-[17px] font-bold">
        {title}
      </h2>
      {note ? <p className="mt-0.5 text-[13px] text-ink3">{note}</p> : null}

      {items.length ? (
        <ul className="mt-3 divide-y divide-rule">
          {items.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2">
              <p className={`min-w-0 text-[15px] leading-snug ${s.source === "declared" || s.source === "validated" ? "" : "inferred"}`}>{s.value}</p>
              <ConfirmButton label="Remove" confirmLabel="Yes, remove" what={s.value} busy={removing === s.id} onConfirm={() => void remove(s)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[14.5px] text-ink3">Nothing here yet.</p>
      )}

      <form onSubmit={add} className="mt-4">
        <label htmlFor={inputId} className="text-[13.5px] font-bold">
          {addLabel}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <input id={inputId} value={value} onChange={(e) => setValue(e.target.value)} maxLength={300} placeholder={placeholder} className={`${fieldClass} sm:flex-1`} />
          <button type="submit" disabled={saving || !value.trim()} className={buttonClass("secondary", "w-auto px-5 sm:mt-1.5")}>
            {saving ? "Adding…" : "Add"}
          </button>
        </div>
      </form>
      <ActionError message={error} />
    </section>
  );
}

/** C5 · Needs & Aspirations: what would help, where they're heading, what they can offer. */
export function NeedsRoom({ founderId }: { founderId: string }) {
  const q = useLoad(() => api.needs(founderId), founderId);
  const audience = useAudience(founderId, "needs");

  if (!q.data) {
    return (
      <AppShell>
        <RoomWaiting title={TITLE} audience={audience} error={q.error} retry={q.retry} waiting="Opening Needs & Aspirations…" />
      </AppShell>
    );
  }

  const data = q.data;

  return (
    <AppShell>
      <RoomHeader title={TITLE} audience={audience} />

      {SECTIONS.map((s) => (
        <Section
          key={s.kind}
          title={s.title}
          note={s.note}
          addLabel={s.addLabel}
          placeholder={s.placeholder}
          items={data[s.kind]}
          onAdd={async (v) => q.setData(await api.addNeed(founderId, s.kind, v))}
          onRemove={async (e) => q.setData(await api.removeState<NeedsData>(e.id, founderId))}
        />
      ))}

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          href="/people"
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded text-[15px] font-bold text-ink hover:text-ember-deep ${focus}`}
        >
          See who could help <span aria-hidden className="text-ember-deep">→</span>
        </Link>
        <p className="text-[13px] text-ink3">Nobody is connected automatically.</p>
      </div>
    </AppShell>
  );
}
