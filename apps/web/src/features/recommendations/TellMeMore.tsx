"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import type { FounderID } from "@idea-district/api-client";

import { Button, ErrorNotice, Label, Tag } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

type Change = { key: string; label: string; text: string; inferred: boolean; isNew: boolean };

const stateKey = (f: string, v: string) => `s:${f}:${v}`;
const personKey = (d: string, i: string) => `p:${d}:${i}`;

function changesBetween(before: FounderID | null, after: FounderID): Change[] {
  const seen = new Set<string>();
  before?.state.forEach((s) => seen.add(stateKey(s.field, s.value)));
  before?.person.forEach((p) => seen.add(personKey(p.dimension, p.insight)));

  const out: Change[] = [];
  after.state.forEach((s) => {
    const k = stateKey(s.field, s.value);
    const isNew = before ? !seen.has(k) : s.facet === "secondary";
    if (isNew || s.facet === "secondary")
      out.push({ key: k, label: s.field, text: s.value, inferred: s.source !== "declared", isNew });
  });
  after.person.forEach((p) => {
    const k = personKey(p.dimension, p.insight);
    const isNew = before ? !seen.has(k) : p.facet === "secondary";
    if (isNew || p.facet === "secondary") out.push({ key: k, label: p.dimension, text: p.insight, inferred: true, isNew });
  });
  // New first.
  return out.sort((a, b) => Number(b.isNew) - Number(a.isNew));
}

/** "Tell me more": free text that goes into the ID, tagged by facet. */
export function TellMeMore({
  founderId,
  onLookAgain,
  compact = false,
}: {
  founderId: string;
  onLookAgain: () => void;
  compact?: boolean;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changes, setChanges] = useState<Change[] | null>(null);
  const before = useRef<FounderID | null>(null);

  // Snapshot the ID so we can show exactly what the new text changed.
  useEffect(() => {
    let live = true;
    api.getId(founderId).then(
      (d) => {
        if (live) before.current = d;
      },
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [founderId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const after = await api.tellMeMore({ founder_id: founderId, text: text.trim() });
      setChanges(changesBetween(before.current, after));
      before.current = after;
      setText("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (changes) {
    return (
      <section className="fade-in rounded-2xl border border-ember/30 bg-card px-[15px] py-[15px]">
        <Label>Your ID changed</Label>
        {changes.length === 0 ? (
          <p className="mt-2 text-[14px] text-ink2">We&rsquo;ve added it to your ID as evidence.</p>
        ) : (
          <ul className="mt-2 divide-y divide-rule">
            {changes.map((c) => (
              <li key={c.key} className="py-3">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink3">{c.label}</p>
                  {c.isNew ? <Tag kind="new" /> : null}
                </div>
                <p className={c.inferred ? "inferred mt-1 text-[16.5px] leading-snug" : "mt-1 text-[15px] leading-snug"}>{c.text}</p>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-col gap-2">
          <Button onClick={onLookAgain}>Look again</Button>
          <Button variant="ghost" onClick={() => setChanges(null)}>
            Tell us something else
          </Button>
        </div>
      </section>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={compact ? "rounded-2xl bg-sand px-[15px] py-[14px]" : "rounded-2xl bg-espresso px-[16px] py-[18px] text-cream"}
    >
      <h2 className={`font-extrabold tracking-[-0.02em] ${compact ? "text-[16px]" : "text-[21px]"}`}>Tell me more about you</h2>
      <p className={`mt-1.5 text-[13.5px] leading-relaxed ${compact ? "text-ink2" : "text-[#D5CDBA]"}`}>
        Anything we don&rsquo;t know yet — another skill, a side project, something you&rsquo;d help others with. It all goes into your ID.
      </p>
      <label htmlFor={id} className="sr-only">
        Tell us more about you
      </label>
      <textarea
        id={id}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="I'm building a community, but I'm also a designer…"
        className="mt-3 w-full resize-y rounded-xl border border-rule bg-card px-3.5 py-3 text-[15px] leading-relaxed text-ink placeholder:text-ink3/80 focus:border-ember focus:outline-none focus-visible:ring-2 focus-visible:ring-ember/30"
      />
      {error ? (
        <div className="mt-3">
          <ErrorNotice message={error} />
        </div>
      ) : null}
      <Button type="submit" className="mt-3" disabled={busy || !text.trim()}>
        {busy ? "Adding to your ID…" : "Add to my ID"}
      </Button>
    </form>
  );
}
