"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { ButtonLink, CalmState, ConfidenceWord, ErrorNotice, IdMark, Label, PhoneFrame, TabBar, Tag } from "@/components/ui";

import { RingsTrue } from "./RingsTrue";
import { useFounderIdData } from "./useFounderIdData";

function Cluster({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="border-t border-rule py-5">
      <Label tone="neutral" as="h2" className="mb-3">
        {label}
      </Label>
      {children}
    </section>
  );
}

const linkRow =
  "flex items-center justify-between rounded-xl border border-rule bg-card px-3.5 py-3 text-[14.5px] font-bold hover:border-ink3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember";

/** Screen 10: My ID — the map. */
export function IdMap({ founderId }: { founderId: string }) {
  const { data, error, retry } = useFounderIdData(founderId);

  if (!data) {
    return (
      <PhoneFrame footer={<TabBar />}>
        {error ? <ErrorNotice message={error} onRetry={retry} /> : <CalmState title="Opening your ID…" />}
      </PhoneFrame>
    );
  }

  if (!data.built_at) {
    return (
      <PhoneFrame footer={<TabBar />}>
        <IdMark />
        <h1 className="mt-6 text-[26px] font-extrabold tracking-[-0.03em]">Your ID isn&rsquo;t built yet.</h1>
        <p className="mt-2 text-[15px] text-ink2">Finish discovery and we&rsquo;ll put it together.</p>
        <div className="mt-auto flex flex-col gap-2 pt-8">
          <ButtonLink href="/id/building">Build my ID now</ButtonLink>
          <ButtonLink href="/discover" variant="ghost">
            Back to discovery
          </ButtonLink>
        </div>
      </PhoneFrame>
    );
  }

  const topPerson = [...data.person].sort((a, b) => b.strength - a.strength).slice(0, 3);
  const openGaps = data.gaps.filter((g) => g.status !== "closed");

  return (
    <PhoneFrame footer={<TabBar />}>
      <header className="flex items-start justify-between gap-4 pb-5">
        <div>
          <Label tone="neutral">Your ID</Label>
          <h1 className="mt-1 text-[28px] font-extrabold leading-tight tracking-[-0.03em]">{data.founder.name}</h1>
          <p className="mt-1 text-[13px] text-ink3">
            {data.decisions} decisions · built just now
          </p>
        </div>
        <IdMark />
      </header>

      {error ? (
        <div className="mb-4">
          <ErrorNotice message={error} onRetry={retry} />
        </div>
      ) : null}

      <Cluster label="Current state">
        <ul className="flex flex-col gap-3">
          {data.state.map((s, i) => (
            <li key={`${s.field}-${i}`}>
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink3">{s.field}</p>
                {s.facet === "secondary" ? <Tag kind="plain">Secondary</Tag> : null}
              </div>
              <p className={s.source === "declared" ? "mt-0.5 text-[15px] leading-snug text-ink" : "inferred mt-0.5 text-[16.5px] leading-snug"}>
                {s.value}
              </p>
            </li>
          ))}
        </ul>
      </Cluster>

      <Cluster label="How you operate">
        <p className="inferred text-[21px] leading-[1.3]">{data.headline}</p>
      </Cluster>

      <Cluster label="Person">
        <ul className="divide-y divide-rule rounded-2xl bg-sand px-[15px]">
          {topPerson.map((p) => (
            <li key={p.dimension} className="flex items-center justify-between gap-3 py-3">
              <span className="text-[14.5px] font-bold">{p.dimension}</span>
              <ConfidenceWord value={p.confidence} />
            </li>
          ))}
        </ul>
        <Link href="/id/person" className={`${linkRow} mt-3`}>
          See how we read you <span aria-hidden className="text-ember">→</span>
        </Link>
      </Cluster>

      <Cluster label="What we don't know yet">
        <p className="text-[15px]">
          <span className="text-[22px] font-extrabold text-ember">{openGaps.length}</span>{" "}
          {openGaps.length === 1 ? "thing" : "things"} we&rsquo;re still working out.
        </p>
        <Link href="/id/gaps" className={`${linkRow} mt-3`}>
          What we still don&rsquo;t know <span aria-hidden className="text-ember">→</span>
        </Link>
      </Cluster>

      <div className="rounded-2xl border border-dashed border-rule px-[15px] py-[14px]">
        <Label>Confidence — {data.overall_confidence}</Label>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink2">
          Built from {data.decisions} decisions. It sharpens with every real outcome.
        </p>
      </div>

      <RingsTrue founderId={founderId} saved={data.rings_true} />

      <ButtonLink href="/for-you" className="mt-6">
        See who you should meet
      </ButtonLink>
    </PhoneFrame>
  );
}
