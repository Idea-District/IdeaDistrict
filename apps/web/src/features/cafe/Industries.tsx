"use client";

import Link from "next/link";
import { useState } from "react";

import type { IndustryTopicSummary } from "@idea-district/api-client";

import { AppShell, CalmState, ErrorNotice, buttonClass } from "@/components/ui";
import { api } from "@/lib/api";

import { BackLink, focus, useLoad } from "./shared";

type Filter = "all" | "for_you" | "market" | "business_model";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "for_you", label: "For you" },
  { value: "market", label: "Markets" },
  { value: "business_model", label: "Business models" },
];
const CATEGORY: Record<IndustryTopicSummary["category"], string> = { market: "Market", business_model: "Business model" };

function keep(t: IndustryTopicSummary, f: Filter) {
  if (f === "all") return true;
  if (f === "for_you") return t.for_you;
  return t.category === f;
}

/** D5 · Explore industries: short reads, with a "For you" filter from the founder's District. */
export function Industries({ founderId }: { founderId: string }) {
  const { data, error, retry } = useLoad(() => api.industries(founderId), founderId);
  const [filter, setFilter] = useState<Filter>("all");
  const shown = data?.filter((t) => keep(t, filter)) ?? [];

  return (
    <AppShell>
      <BackLink href="/quick-breaks" label="Quick Breaks room" />
      <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ember-deep">Explore industries</p>
      <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.02em]">Short reads, then your own questions</h1>
      <p className="mt-2 max-w-[56ch] text-[15px] text-ink2">Patterns worth checking against what you see, never statistics to quote. Each one ends with questions to ask yourself.</p>

      <div role="group" aria-label="Filter reads" className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`min-h-[40px] rounded-full border px-4 text-[14px] font-semibold ${filter === f.value ? "border-ink bg-ink text-cream" : "border-rule bg-card hover:border-ink"} ${focus}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mt-5">
          <ErrorNotice message={error} onRetry={retry} />
        </div>
      ) : null}
      {!data && !error ? <CalmState title="Finding reads…" /> : null}
      {data && shown.length === 0 ? (
        <p className="mt-6 text-[15px] text-ink3">
          {filter === "for_you" ? "Nothing matches your District yet. Try All." : "No reads here yet."}
        </p>
      ) : null}

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {shown.map((t) => (
          <li key={t.slug}>
            <Link href={`/quick-breaks/industries/${t.slug}`} className={`flex h-full flex-col gap-2 rounded-[16px] border border-rule bg-card p-5 hover:border-ink ${focus}`}>
              <span className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-ink3">
                <span className="uppercase tracking-[0.1em]">{CATEGORY[t.category]}</span>· {t.minutes} min read
                {t.for_you ? <span className="rounded-full bg-ember px-2 py-0.5 text-[11px] font-bold text-ink">For you</span> : null}
              </span>
              <span className="text-[17px] font-bold leading-snug">{t.title}</span>
              <span className="text-[14px] leading-relaxed text-ink2">{t.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}

/** D6 · One read. */
export function IndustryRead({ founderId, slug }: { founderId: string; slug: string }) {
  const { data, error, retry } = useLoad(() => api.industry(slug, founderId), `${slug}:${founderId}`);

  return (
    <AppShell>
      <BackLink href="/quick-breaks/industries" label="Explore industries" />
      {error ? <ErrorNotice message={error} onRetry={retry} /> : null}
      {!data && !error ? <CalmState title="Opening the read…" /> : null}
      {data ? (
        <article>
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ember-deep">
            {CATEGORY[data.category]} · {data.minutes} min read
          </p>
          <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.02em]">{data.title}</h1>
          <p className="mt-2 text-[16px] leading-relaxed text-ink2">{data.summary}</p>

          <ol className="mt-6 flex flex-col gap-5">
            {data.sections.map((s, i) => (
              <li key={s.heading} className="flex gap-4">
                <span aria-hidden className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-ember text-[13px] font-bold text-ink">
                  {i + 1}
                </span>
                <div>
                  <h2 className="text-[17px] font-bold">{s.heading}</h2>
                  <p className="mt-1 text-[15.5px] leading-relaxed text-ink2">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          {data.questions.length ? (
            <section className="mt-7 rounded-[16px] bg-espresso p-5 text-cream">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-ember-light">Questions to ask yourself</h2>
              <ul className="mt-2 flex flex-col gap-2">
                {data.questions.map((q) => (
                  <li key={q} className="text-[16px] leading-snug">
                    {q}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            <Link href={`/ask?about=${encodeURIComponent(data.title)}`} className={buttonClass("primary", "w-auto px-5")}>
              Ask ID about this
            </Link>
            <Link href="/quick-breaks/simulator" className={buttonClass("secondary", "w-auto px-5")}>
              Test an assumption
            </Link>
          </div>
        </article>
      ) : null}
    </AppShell>
  );
}
