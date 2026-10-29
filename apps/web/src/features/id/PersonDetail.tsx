"use client";

import { AppBar, CalmState, ErrorNotice, Label, PhoneFrame, ReadStrength, Tag } from "@/components/ui";

import { useFounderIdData } from "./useFounderIdData";

/** Screen 11: every Person attribute, how settled the read is (in words), and its evidence. */
export function PersonDetail({ founderId }: { founderId: string }) {
  const { data, error, retry } = useFounderIdData(founderId);

  return (
    <PhoneFrame>
      <AppBar backHref="/id" backLabel="Your ID" title="Person" />
      {!data ? (
        error ? (
          <ErrorNotice message={error} onRetry={retry} />
        ) : (
          <CalmState title="Reading your ID…" />
        )
      ) : (
        <div className="fade-in">
          <Label tone="neutral">How we read you</Label>
          <p className="mt-2 text-[14px] leading-relaxed text-ink2">
            Who you are, not what&rsquo;s happening to you. Each line says how settled our read is, and what it rests on.
          </p>
          <ul className="mt-5 divide-y divide-rule border-t border-rule">
            {data.person.map((p) => (
              <li key={p.dimension} className="py-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-[16px] font-extrabold tracking-[-0.02em]">
                    {p.dimension}
                    {p.facet === "secondary" ? <Tag kind="plain">Secondary</Tag> : null}
                  </h2>
                  <ReadStrength value={p.confidence} className="shrink-0" />
                </div>
                <p className="inferred mt-2 text-[17px] leading-[1.35]">{p.insight}</p>
                <p className="mt-2 text-[12.5px] text-ink3">{p.evidence}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PhoneFrame>
  );
}
