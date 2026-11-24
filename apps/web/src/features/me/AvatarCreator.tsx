"use client";

import { useState } from "react";

import type { AvatarChoice } from "@idea-district/api-client";

import { AppShell, Button, CalmState, ErrorNotice } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { BackLink, Eyebrow, useLoad } from "@/features/cafe/shared";

import { AVATAR_WORDS, AvatarArt, COLOUR_HEX } from "./AvatarArt";

type Part = keyof AvatarChoice;

const OPTIONS: { [K in Part]: AvatarChoice[K][] } = {
  role: ["builder", "operator", "seller", "researcher"],
  personality: ["calm", "bold", "curious"],
  style: ["line", "flat", "paper"],
  colour: ["persimmon", "forest", "dust", "beige"],
};

const HINTS: Record<Part, string> = {
  role: "Changes the shoulders and what you wear.",
  personality: "Changes the brows and the mouth.",
  style: "How it is drawn.",
  colour: "The main colour.",
};

const TITLES: Record<Part, string> = { role: "Role", personality: "Personality", style: "Style", colour: "Colour" };

const START: AvatarChoice = { role: "builder", personality: "calm", style: "flat", colour: "persimmon" };

function pick<T>(xs: T[]): T {
  return xs[Math.floor(Math.random() * xs.length)]!;
}

function Group<K extends Part>({ part, value, onChange }: { part: K; value: AvatarChoice[K]; onChange: (v: AvatarChoice[K]) => void }) {
  const words = AVATAR_WORDS[part] as Record<string, string>;
  return (
    <fieldset className="rounded-[16px] border border-rule bg-card p-4">
      <legend className="sr-only">{TITLES[part]}</legend>
      <p aria-hidden className="text-[15px] font-bold">
        {TITLES[part]}
      </p>
      <p className="mt-0.5 text-[13px] text-ink3">{HINTS[part]}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {OPTIONS[part].map((o) => {
          const on = o === value;
          return (
            <label key={o} className="relative cursor-pointer">
              <input
                type="radio"
                name={`avatar-${part}`}
                value={o}
                checked={on}
                onChange={() => onChange(o as AvatarChoice[K])}
                className="peer sr-only"
              />
              <span
                className={`flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-[14px] font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ember ${
                  on ? "border-ink bg-ink text-cream" : "border-rule bg-screen text-ink2 hover:border-ink3"
                }`}
              >
                {part === "colour" ? (
                  <span
                    aria-hidden
                    className="size-5 rounded-full border border-ink/30"
                    style={{ background: COLOUR_HEX[o as AvatarChoice["colour"]] }}
                  />
                ) : null}
                {words[o]}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** A9 / G1 · Avatar creator: a 2D portrait from four choices. No photo. */
export function AvatarCreator({ founderId }: { founderId: string }) {
  const q = useLoad(() => api.profile(founderId), founderId);
  const [draft, setDraft] = useState<AvatarChoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const header = (
    <>
      <BackLink href="/you" label="You" />
      <Eyebrow>Me</Eyebrow>
      <h1 className="mt-1 text-[26px] font-bold tracking-[-0.02em]">Your avatar</h1>
    </>
  );

  if (!q.data) {
    return (
      <AppShell>
        {header}
        <div className="mt-6">{q.error ? <ErrorNotice message={q.error} onRetry={q.retry} /> : <CalmState title="Getting your avatar…" />}</div>
      </AppShell>
    );
  }

  const choice = draft ?? q.data.avatar ?? START;

  function set<K extends Part>(part: K, v: AvatarChoice[K]) {
    setDraft({ ...choice, [part]: v });
    setStatus(null);
  }

  function shuffle() {
    setDraft({ role: pick(OPTIONS.role), personality: pick(OPTIONS.personality), style: pick(OPTIONS.style), colour: pick(OPTIONS.colour) });
    setStatus(null);
  }

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      const p = await api.setAvatar(founderId, choice);
      q.setData(p);
      setDraft(null);
      setStatus({ ok: true, text: "Avatar saved." });
    } catch (e) {
      setStatus({ ok: false, text: `Couldn't save that. ${errorMessage(e)}` });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      {header}
      <p className="mt-2 text-[15px] text-ink2">No photo needed. Built from your choices, and you can change it any time.</p>

      <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-start">
        <div className="flex flex-col items-center gap-4 rounded-[16px] border border-rule bg-card p-5 md:sticky md:top-6 md:w-[240px] md:shrink-0">
          <AvatarArt choice={choice} size={180} />
          <Button variant="secondary" onClick={shuffle}>
            Try a random one
          </Button>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Group part="role" value={choice.role} onChange={(v) => set("role", v)} />
          <Group part="personality" value={choice.personality} onChange={(v) => set("personality", v)} />
          <Group part="style" value={choice.style} onChange={(v) => set("style", v)} />
          <Group part="colour" value={choice.colour} onChange={(v) => set("colour", v)} />

          <Button onClick={() => void save()} disabled={saving} className="mt-2">
            {saving ? "Saving…" : "Save avatar"}
          </Button>
          <p aria-live="polite" className={`min-h-[20px] text-[13.5px] ${status?.ok ? "text-ink2" : "text-ember-deep"}`}>
            {status?.text ?? ""}
          </p>
        </div>
      </div>
    </AppShell>
  );
}
