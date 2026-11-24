"use client";

import Link from "next/link";
import { useState } from "react";

import type { WhatsOnItem } from "@idea-district/api-client";

import { AppShell, CalmState, ErrorNotice } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

import { BackLink, Eyebrow, focus, useLoad, whenText } from "./shared";

const GROUPS: { kind: WhatsOnItem["kind"]; title: string }[] = [
  { kind: "event", title: "Events" },
  { kind: "open_call", title: "Open calls" },
  { kind: "table", title: "New tables" },
];

/** B6 · What's On: the counter. */
export function WhatsOnList({ founderId }: { founderId: string }) {
  const { data, setData, error, retry } = useLoad(() => api.whatsOn(founderId), `${founderId}`);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function toggle(item: WhatsOnItem) {
    const on = !item.saved;
    setData((list) => list?.map((x) => (x.id === item.id ? { ...x, saved: on } : x)) ?? null);
    try {
      const updated = await api.saveWhatsOn(item.id, founderId, on);
      setData((list) => list?.map((x) => (x.id === item.id ? updated : x)) ?? null);
    } catch (e) {
      setSaveError(errorMessage(e));
      setData((list) => list?.map((x) => (x.id === item.id ? { ...x, saved: !on } : x)) ?? null);
    }
  }

  return (
    <AppShell>
      <BackLink href="/cafe" label="Cafe" />
      <Eyebrow>The counter</Eyebrow>
      <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.02em]">What&rsquo;s on this week</h1>
      {error ? (
        <div className="mt-5">
          <ErrorNotice message={error} onRetry={retry} />
        </div>
      ) : null}
      {saveError ? <p role="alert" className="mt-3 text-[13.5px] text-ember-deep">{saveError}</p> : null}
      {!data && !error ? <CalmState title="Checking the counter…" /> : null}
      {data && data.length === 0 ? <p className="mt-6 text-[15px] text-ink3">Nothing on the counter this week.</p> : null}

      {GROUPS.map((g) => {
        const items = data?.filter((w) => w.kind === g.kind) ?? [];
        if (!items.length) return null;
        return (
          <section key={g.kind} className="mt-7" aria-labelledby={`g-${g.kind}`}>
            <h2 id={`g-${g.kind}`} className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink3">
              {g.title}
            </h2>
            <ul className="mt-3 flex flex-col gap-3">
              {items.map((w) => (
                <li key={w.id} className="rounded-[16px] border border-rule bg-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {w.starts_at || w.place ? (
                        <p className="text-[12.5px] font-semibold text-ember-deep">{[w.starts_at ? whenText(w.starts_at) : "", w.place ?? ""].filter(Boolean).join(" · ")}</p>
                      ) : null}
                      <h3 className="mt-0.5 text-[17px] font-bold leading-snug">{w.title}</h3>
                      {w.detail ? <p className="mt-1 text-[14.5px] leading-relaxed text-ink2">{w.detail}</p> : null}
                    </div>
                    <button
                      type="button"
                      aria-pressed={w.saved}
                      onClick={() => void toggle(w)}
                      className={`min-h-[40px] shrink-0 rounded-full border px-4 text-[13.5px] font-semibold ${w.saved ? "border-ink bg-ink text-cream" : "border-rule bg-screen hover:border-ink"} ${focus}`}
                    >
                      {w.saved ? "Saved" : "Save"}
                    </button>
                  </div>
                  {w.table_id ? (
                    <Link href={`/cafe/tables/${w.table_id}`} className={`mt-3 inline-flex min-h-[40px] items-center text-[14px] font-bold underline underline-offset-4 ${focus}`}>
                      Go to the table <span aria-hidden className="ml-1">→</span>
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </AppShell>
  );
}
