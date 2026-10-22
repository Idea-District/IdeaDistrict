"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

import type { Privacy } from "@idea-district/api-client";

import { IdMark, Label, PhoneFrame, TabBar } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useStored } from "@/lib/session";

type Field = keyof Privacy;

/** Investor visibility is opt-in, so both investor switches default to off. */
const defaults: Privacy = {
  id_visible_to_investors: false,
  state_visible_to_investors: false,
  allow_introductions: true,
};

const rows: { field: Field; label: string; note?: string }[] = [
  { field: "id_visible_to_investors", label: "Investors can see my ID" },
  { field: "state_visible_to_investors", label: "Investors can see what I'm working on now" },
  {
    field: "allow_introductions",
    label: "Open to introductions",
    note: "When off, we won't suggest you to anyone or anyone to you.",
  },
];

function Switch({
  label,
  note,
  on,
  disabled,
  error,
  onToggle,
}: {
  label: string;
  note?: string;
  on: boolean;
  disabled: boolean;
  error: string | null;
  onToggle: () => void;
}) {
  const id = useId();
  return (
    <li className="py-3.5">
      <div className="flex items-center justify-between gap-4">
        <span id={id} className="text-[14.5px] font-bold">
          {label}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby={id}
          disabled={disabled}
          onClick={onToggle}
          className={`relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors duration-150 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember ${on ? "bg-ember" : "bg-rule"}`}
        >
          <span
            aria-hidden
            className={`absolute top-[3px] left-[3px] size-5 rounded-full bg-white shadow transition-transform duration-150 ${on ? "translate-x-[18px]" : ""}`}
          />
        </button>
      </div>
      {note ? <p className="mt-1 pr-14 text-[12.5px] leading-relaxed text-ink3">{note}</p> : null}
      {error ? (
        <p role="alert" className="mt-1 text-[12.5px] text-ember-deep">
          {error}
        </p>
      ) : null}
    </li>
  );
}

/** "You": name, a way into the ID, and consent switches stored by the API. */
export function YouScreen({ founderId }: { founderId: string }) {
  const name = useStored("founderName");
  const [privacy, setPrivacy] = useState<Privacy | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [pending, setPending] = useState<Partial<Record<Field, boolean>>>({});

  useEffect(() => {
    let live = true;
    api.privacy(founderId).then(
      (p) => {
        if (!live) return;
        setPrivacy(p);
        setLoadError(null);
      },
      (e) => live && setLoadError(errorMessage(e)),
    );
    return () => {
      live = false;
    };
  }, [founderId]);

  async function toggle(field: Field) {
    if (!privacy || pending[field]) return;
    const before = privacy[field];
    setPrivacy((p) => (p ? { ...p, [field]: !before } : p));
    setErrors((e) => ({ ...e, [field]: undefined }));
    setPending((p) => ({ ...p, [field]: true }));
    try {
      const saved = await api.updatePrivacy(founderId, { [field]: !before });
      setPrivacy(saved);
    } catch (e) {
      setPrivacy((p) => (p ? { ...p, [field]: before } : p));
      setErrors((x) => ({ ...x, [field]: `Couldn't save that. ${errorMessage(e)}` }));
    } finally {
      setPending((p) => ({ ...p, [field]: false }));
    }
  }

  const shown = privacy ?? defaults;

  return (
    <PhoneFrame footer={<TabBar />}>
      <div className="flex items-center gap-4">
        <IdMark />
        <div>
          <Label tone="neutral">You</Label>
          <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">{name ?? " "}</h1>
        </div>
      </div>

      <Link
        href="/id"
        className="mt-6 flex items-center justify-between rounded-xl border border-rule bg-card px-3.5 py-3 text-[14.5px] font-bold hover:border-ink3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
      >
        Open my ID <span aria-hidden className="text-ember">→</span>
      </Link>

      <section className="mt-6 rounded-2xl bg-sand px-[15px] py-[6px]">
        <Label tone="neutral" as="h2" className="pt-3">
          Visibility
        </Label>
        <ul className="divide-y divide-rule">
          {rows.map((r) => (
            <Switch
              key={r.field}
              label={r.label}
              note={r.note}
              on={shown[r.field]}
              disabled={!privacy}
              error={errors[r.field] ?? null}
              onToggle={() => toggle(r.field)}
            />
          ))}
        </ul>
      </section>
      {loadError ? (
        <p role="alert" className="mt-3 text-[12.5px] text-ember-deep">
          Couldn&rsquo;t load your settings. {loadError}
        </p>
      ) : null}
      <p className="mt-3 text-[12.5px] leading-relaxed text-ink3">You always see exactly what an investor sees.</p>
    </PhoneFrame>
  );
}
