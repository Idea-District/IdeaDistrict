"use client";

import Link from "next/link";

import type { InvestorIntro } from "@idea-district/api-client";

import { api } from "@/lib/api";
import { personLine, shortDate } from "@/lib/format";

import { InvestorShell } from "./InvestorShell";
import { card, focus, InvestorEyebrow, PersonDot, SectionTitle, SharesLine, STAGE_NAMES, STAGES, ThesisFit, themeWord, useLoad, Waiting } from "./parts";

const linkClass = `inline-flex min-h-[44px] items-center rounded text-[14px] font-bold text-espresso underline underline-offset-4 hover:text-ink ${focus}`;

/** I3 · The investor dashboard: introductions waiting, pipeline at a glance, insights teaser. */
export function Dashboard({ investorId }: { investorId: string }) {
  const q = useLoad(() => api.investorHome(investorId), investorId);
  if (!q.data) return <Waiting error={q.error} retry={q.retry} title="Opening your dashboard…" />;
  const h = q.data;

  return (
    <InvestorShell>
      <header className="rounded-[20px] bg-espresso p-5 text-cream lg:p-8">
        <InvestorEyebrow onDark>Investor · {h.firm || "Your firm"}</InvestorEyebrow>
        <h1 className="mt-2 text-[28px] font-bold leading-[1.1] tracking-[-0.02em] lg:text-[34px]">Good to see you, {h.name.split(" ")[0]}.</h1>
        <p className="mt-2 max-w-[560px] text-[15px] leading-relaxed text-cream/85">
          {h.introductions.length === 0
            ? "Nothing waiting for you right now."
            : `${h.introductions.length} ${h.introductions.length === 1 ? "founder asked" : "founders asked"} to meet you.`}
          {h.has_thesis ? null : (
            <>
              {" "}
              <Link href="/investor/thesis" className={`font-bold text-ember-light underline underline-offset-4 ${focus}`}>
                Set your thesis
              </Link>{" "}
              so we can say how founders fit.
            </>
          )}
        </p>
      </header>

      <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_320px]">
        <section aria-labelledby="waiting">
          <SectionTitle id="waiting">Introductions waiting</SectionTitle>
          {h.introductions.length === 0 ? (
            <div className={`${card} mt-3`}>
              <p className="text-[15px] leading-relaxed text-ink2">
                No introductions yet. Founders reach you only when they&rsquo;re raising and have opted in.
              </p>
            </div>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {h.introductions.map((i) => (
                <IntroCard key={i.request_id} intro={i} />
              ))}
            </ul>
          )}
        </section>

        <aside className="flex flex-col gap-5">
          <section aria-labelledby="pipeline-glance" className={card}>
            <SectionTitle id="pipeline-glance">Your pipeline</SectionTitle>
            <dl className="mt-3 divide-y divide-rule">
              {STAGES.map((s) => (
                <div key={s} className="flex items-baseline justify-between gap-3 py-2">
                  <dt className="text-[14.5px] text-ink2">{STAGE_NAMES[s]}</dt>
                  <dd className="text-[15px] font-bold text-ink">
                    {h.pipeline_counts[s]} {h.pipeline_counts[s] === 1 ? "founder" : "founders"}
                  </dd>
                </div>
              ))}
            </dl>
            <Link href="/investor/pipeline" className={linkClass}>
              Open the pipeline
            </Link>
          </section>

          <section aria-labelledby="insight-teaser" className={card}>
            <SectionTitle id="insight-teaser">What founders need now</SectionTitle>
            {h.insight_teaser.length === 0 ? (
              <p className="mt-2 text-[14px] text-ink2">Not enough founders share a theme yet to show one.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5">
                {h.insight_teaser.map((t) => (
                  <li key={t.theme} className="text-[14.5px] text-ink">
                    <span className="font-bold capitalize">{t.theme}</span> <span className="text-ink3">· {themeWord(t)}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/investor/insights" className={linkClass}>
              See all insights
            </Link>
          </section>

          <Link
            href="/investor/post"
            className={`flex min-h-[48px] items-center justify-center rounded-[10px] bg-espresso px-4 text-[15px] font-bold text-cream hover:bg-espresso2 ${focus}`}
          >
            Post an opportunity
          </Link>
        </aside>
      </div>
    </InvestorShell>
  );
}

function IntroCard({ intro }: { intro: InvestorIntro }) {
  return (
    <li className={card}>
      <div className="flex items-start gap-3">
        <PersonDot person={intro.person} size={42} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="text-[17px] font-bold text-ink">{intro.person.name}</p>
            <span className="text-[12px] text-ink3">{shortDate(intro.sent_at)}</span>
          </div>
          <p className="text-[13px] text-ink3">{personLine(intro.person)}</p>
        </div>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-ink">{intro.why}</p>
      <div className="mt-2 flex flex-col gap-1">
        <ThesisFit fit={intro.thesis_fit} />
        <SharesLine rooms={intro.shares_rooms} />
      </div>
      <Link href={`/investor/introductions/${intro.request_id}`} className={linkClass}>
        Review introduction from {intro.person.name}
      </Link>
    </li>
  );
}
