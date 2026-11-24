"use client";

import type { InsightTheme } from "@idea-district/api-client";

import { api } from "@/lib/api";

import { InvestorShell } from "./InvestorShell";
import { card, PageTitle, SectionTitle, themeWord, useLoad, Waiting } from "./parts";

/** I7 · Anonymised, aggregated themes across the community. No names, no bars, no scores. */
export function InsightsScreen({ investorId }: { investorId: string }) {
  const q = useLoad(() => api.insights(investorId), investorId);
  if (!q.data) return <Waiting error={q.error} retry={q.retry} title="Gathering themes…" />;
  const d = q.data;
  const small = d.founders_in_community !== "more than 100";

  return (
    <InvestorShell>
      <PageTitle title="Insights" sub={<span>Anonymised and aggregated across the community. {d.rule}</span>} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-[16px] bg-espresso px-5 py-4 text-cream">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-ember-light">Founders in the community</p>
          <p className="mt-1 text-[22px] font-bold first-letter:uppercase">{d.founders_in_community}</p>
        </div>
        {small ? (
          <p className="rounded-full border border-rule bg-card px-4 py-2 text-[13px] font-semibold text-ink2">
            Sample data while the community is small
          </p>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <ThemeList id="needs" title="Top needs" themes={d.top_needs} />
        <ThemeList id="offers" title="Common offers" themes={d.common_offers} />
        <ThemeList id="build" title="What founders build" themes={d.what_founders_build} />
      </div>
    </InvestorShell>
  );
}

function ThemeList({ id, title, themes }: { id: string; title: string; themes: InsightTheme[] }) {
  return (
    <section aria-labelledby={id} className={card}>
      <SectionTitle id={id}>{title}</SectionTitle>
      {themes.length === 0 ? (
        <p className="mt-2 text-[14px] text-ink3">No theme is shared by enough founders yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-rule">
          {themes.map((t) => (
            <li key={t.theme} className="flex items-baseline justify-between gap-3 py-2">
              <span className="text-[15px] font-bold capitalize text-ink">{t.theme}</span>
              <span className="text-[13px] text-ink3">{themeWord(t)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
