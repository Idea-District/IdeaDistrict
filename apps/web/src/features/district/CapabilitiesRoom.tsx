"use client";

import Link from "next/link";

import { AppShell, ReadStrength } from "@/components/ui";
import { api } from "@/lib/api";
import { focus, useLoad } from "@/features/cafe/shared";

import { RoomHeader, RoomWaiting, useAudience } from "./rooms";

const TITLE = "Capabilities";

const KEY = [
  { value: "low", note: "We've seen it once or twice. Easy to be wrong." },
  { value: "medium", note: "It keeps showing up, but we're still checking." },
  { value: "high", note: "It shows up in most of what you've told and shown us." },
] as const;

const linkCls = `flex min-h-[52px] items-center justify-between gap-3 rounded-[12px] border border-rule bg-card px-4 py-3 text-[15px] font-bold hover:border-ink ${focus}`;

/** C7 · Capabilities: how we read the founder (Person), in words, with what each read rests on. */
export function CapabilitiesRoom({ founderId }: { founderId: string }) {
  const q = useLoad(() => api.capabilities(founderId), founderId);
  const audience = useAudience(founderId, "capabilities");

  if (!q.data) {
    return (
      <AppShell>
        <RoomWaiting title={TITLE} audience={audience} error={q.error} retry={q.retry} waiting="Reading your capabilities…" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <RoomHeader
        title={TITLE}
        audience={audience}
        sub={
          <>
            How you operate, as we read it. <span className="inferred">Italic is what we worked out</span>, not what you told us.
          </>
        }
      />

      {q.data.length === 0 ? (
        <p className="mt-6 text-[14.5px] text-ink3">We haven&rsquo;t read enough of your decisions yet.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {q.data.map((c) => (
            <li key={c.dimension} className="rounded-[16px] border border-rule bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink3">{c.dimension}</h2>
                {c.enough_evidence ? <ReadStrength value={c.confidence} /> : <span className="text-[12.5px] font-bold text-ink3">Not enough evidence yet</span>}
              </div>
              <p className="inferred mt-2 text-[16px] leading-snug">{c.insight}</p>
              <p className="mt-2 text-[13px] text-ink3">Rests on: {c.evidence}</p>
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="cap-key" className="mt-6 rounded-[16px] bg-sand p-4">
        <h2 id="cap-key" className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink3">
          How sure we are
        </h2>
        <dl className="mt-2 flex flex-col gap-2">
          {KEY.map((k) => (
            <div key={k.value}>
              <dt>
                <ReadStrength value={k.value} />
              </dt>
              <dd className="text-[13.5px] text-ink2">{k.note}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-6 flex flex-col gap-2">
        <Link href="/id/person" className={linkCls}>
          See how we read you in full <span aria-hidden className="text-ember-deep">→</span>
        </Link>
        <Link href="/id/gaps" className={linkCls}>
          What we don&rsquo;t know yet <span aria-hidden className="text-ember-deep">→</span>
        </Link>
      </div>
    </AppShell>
  );
}
