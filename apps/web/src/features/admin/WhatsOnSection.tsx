"use client";

import { useState, type FormEvent } from "react";

import type { WhatsOnItem, WhatsOnKind } from "@idea-district/api-client";

import { buttonClass, ErrorNotice } from "@/components/ui";

import { Card, Field, inputClass, localToIso, Pill, Saved, smallButton, useAdminAction, whenLabel } from "./parts";

const KINDS: { value: WhatsOnKind; label: string }[] = [
  { value: "event", label: "Event" },
  { value: "open_call", label: "Open call" },
  { value: "table", label: "Table" },
];
const kindLabel = (k: WhatsOnKind) => KINDS.find((x) => x.value === k)?.label ?? k;

/** What's On: the short list of events, open calls and tables in the Cafe. */
export function WhatsOnSection({ items }: { items: WhatsOnItem[] }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <ItemList items={items} />
      <AddItem />
    </div>
  );
}

function ItemList({ items }: { items: WhatsOnItem[] }) {
  const { busy, error, run } = useAdminAction();
  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[18px] font-bold">Current items</h2>
        <p className="text-[13px] text-ink3">Archived items leave the Cafe</p>
      </div>
      {error ? (
        <div className="mt-3">
          <ErrorNotice message={error} />
        </div>
      ) : null}
      {items.length === 0 ? (
        <p className="mt-4 text-[14.5px] text-ink2">Nothing on right now. Add an event or open call.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {items.map((w) => {
            const when = whenLabel(w.starts_at);
            const meta = [when, w.place].filter(Boolean).join(" · ");
            return (
              <li key={w.id} className="flex flex-col gap-3 rounded-[12px] border border-rule p-3.5 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={w.kind === "open_call" ? "tint" : w.kind === "table" ? "forest" : "plain"}>{kindLabel(w.kind)}</Pill>
                    <h3 className="text-[15.5px] font-bold">{w.title}</h3>
                  </div>
                  {w.detail ? <p className="mt-1.5 text-[14px] leading-snug text-ink2">{w.detail}</p> : null}
                  <p className="mt-2 text-[12.5px] text-ink3">{meta || "No date or place"}</p>
                </div>
                <button
                  type="button"
                  className={smallButton("secondary", "shrink-0 self-start")}
                  disabled={busy !== null}
                  onClick={() => run(w.id, (c) => c.archiveWhatsOn(w.id))}
                  aria-label={`Archive ${w.title}`}
                >
                  {busy === w.id ? "Archiving…" : "Archive"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function AddItem() {
  const { busy, error, run } = useAdminAction();
  const [kind, setKind] = useState<WhatsOnKind>("event");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [place, setPlace] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const saving = busy !== null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaved(null);
    const iso = localToIso(startsAt);
    const res = await run("add", (c) =>
      c.addWhatsOn({
        kind,
        title: title.trim(),
        ...(detail.trim() ? { detail: detail.trim() } : {}),
        ...(iso ? { starts_at: iso } : {}),
        ...(place.trim() ? { place: place.trim() } : {}),
      }),
    );
    if (res) {
      setTitle("");
      setDetail("");
      setStartsAt("");
      setPlace("");
      setSaved(`${kindLabel(kind)} added to What's On.`);
    }
  }

  return (
    <Card>
      <h2 className="text-[18px] font-bold">Add an item</h2>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
        <fieldset disabled={saving} className="flex flex-col gap-4">
          <Field label="Kind">
            {(p) => (
              <select {...p} value={kind} onChange={(e) => setKind(e.target.value as WhatsOnKind)} className={inputClass}>
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Title">
            {(p) => <input {...p} required minLength={3} maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />}
          </Field>
          <Field label="Detail" optional>
            {(p) => (
              <textarea {...p} maxLength={600} rows={3} value={detail} onChange={(e) => setDetail(e.target.value)} className={`${inputClass} resize-y`} />
            )}
          </Field>
          <Field label="Start" optional>
            {(p) => <input {...p} type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputClass} />}
          </Field>
          <Field label="Place" optional>
            {(p) => <input {...p} maxLength={160} value={place} placeholder="e.g. Indiranagar, or Online" onChange={(e) => setPlace(e.target.value)} className={inputClass} />}
          </Field>
        </fieldset>
        {error ? <ErrorNotice message={error} /> : null}
        {saved ? <Saved>{saved}</Saved> : null}
        <button type="submit" className={buttonClass("primary")} disabled={saving}>
          {saving ? "Adding…" : "Add to What's On"}
        </button>
      </form>
    </Card>
  );
}
