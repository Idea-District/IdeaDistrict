"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";

import type { Profile } from "@idea-district/api-client";

import { Button, ErrorNotice, buttonClass } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { session } from "@/lib/session";
import { focus, useLoad } from "@/features/cafe/shared";

import { AvatarOrInitial } from "./AvatarArt";

const input = `mt-1 min-h-[44px] w-full rounded-[10px] border border-rule bg-screen px-3 text-[15px] ${focus}`;

function EditForm({ founderId, profile, onDone }: { founderId: string; profile: Profile; onDone: (p: Profile | null) => void }) {
  const [name, setName] = useState(profile.name);
  const [oneLine, setOneLine] = useState(profile.one_line);
  const [city, setCity] = useState(profile.city);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ids = { name: useId(), oneLine: useId(), city: useId() };

  async function save() {
    if (!name.trim()) {
      setError("Add your name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateProfile({ founder_id: founderId, name, one_line: oneLine, city });
      session.setFounderName(updated.name);
      onDone(updated);
    } catch (e) {
      setError(`Couldn't save that. ${errorMessage(e)}`);
      setSaving(false);
    }
  }

  return (
    <form
      className="mt-4 flex flex-col gap-3 border-t border-rule pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div>
        <label htmlFor={ids.name} className="text-[13.5px] font-bold">
          Name
        </label>
        <input id={ids.name} className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
      </div>
      <div>
        <label htmlFor={ids.oneLine} className="text-[13.5px] font-bold">
          One line about you
        </label>
        <input
          id={ids.oneLine}
          className={input}
          value={oneLine}
          onChange={(e) => setOneLine(e.target.value)}
          placeholder="e.g. Building tools for small clinics"
          maxLength={140}
        />
      </div>
      <div>
        <label htmlFor={ids.city} className="text-[13.5px] font-bold">
          City
        </label>
        <input id={ids.city} className={input} value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" maxLength={80} />
      </div>
      {error ? (
        <p role="alert" className="text-[13px] text-ember-deep">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="w-auto" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button variant="secondary" className="w-auto" onClick={() => onDone(null)} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

const linkRow = `flex min-h-[48px] items-center justify-between rounded-xl border border-rule bg-card px-3.5 py-3 text-[14.5px] font-bold hover:border-ink3 ${focus}`;

/** G1/G2 · The top of "You": avatar or initial, name, one line, city, and the Me links. */
export function ProfileCard({ founderId }: { founderId: string }) {
  const q = useLoad(() => api.profile(founderId), founderId);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);
  const p = q.data;

  return (
    <>
      <section aria-label="Your profile" className="rounded-[16px] border border-rule bg-card p-4">
        {p ? (
          <>
            <div className="flex items-center gap-4">
              <AvatarOrInitial name={p.name} avatar={p.avatar} size={84} />
              <div className="min-w-0 flex-1">
                <h1 className="text-[24px] leading-tight font-extrabold tracking-[-0.03em] break-words">{p.name}</h1>
                <p className={`mt-1 text-[14px] ${p.one_line ? "text-ink2" : "text-ink3"}`}>{p.one_line || "No one-line yet."}</p>
                {p.city ? <p className="mt-0.5 text-[13px] text-ink3">{p.city}</p> : null}
              </div>
              {!editing ? (
                <button
                  ref={editButton}
                  type="button"
                  className={buttonClass("secondary", "w-auto shrink-0 self-start px-3.5 py-[10px] text-[14px]")}
                  onClick={() => {
                    setEditing(true);
                    setSaved(false);
                  }}
                >
                  Edit<span className="sr-only"> profile</span>
                </button>
              ) : null}
            </div>
            {editing ? (
              <EditForm
                founderId={founderId}
                profile={p}
                onDone={(next) => {
                  if (next) {
                    q.setData(next);
                    setSaved(true);
                  }
                  setEditing(false);
                  setTimeout(() => editButton.current?.focus(), 0);
                }}
              />
            ) : null}
            <p aria-live="polite" className="text-[13px] text-ink2">
              {saved ? <span className="mt-2 block">Profile saved.</span> : null}
            </p>
          </>
        ) : q.error ? (
          <ErrorNotice message={q.error} onRetry={q.retry} />
        ) : (
          <p className="py-6 text-center text-[14px] text-ink3">Getting your profile…</p>
        )}
      </section>

      <nav aria-label="Me" className="mt-3 flex flex-col gap-2">
        <Link href="/me/avatar" className={linkRow}>
          {p?.avatar ? "Change avatar" : "Create your avatar"} <span aria-hidden className="text-ember-deep">→</span>
        </Link>
        <Link href="/district/visibility" className={linkRow}>
          Who sees what <span aria-hidden className="text-ember-deep">→</span>
        </Link>
        <Link href="/me/account" className={linkRow}>
          Account <span aria-hidden className="text-ember-deep">→</span>
        </Link>
      </nav>
    </>
  );
}
