"use client";

import { AppBar, CalmState, ConfidenceWord, ErrorNotice, Label, PhoneFrame, StrengthBar, Tag } from "@/components/ui";

import { useFounderIdData } from "./useFounderIdData";

/** Screen 11: every Person attribute with confidence, strength and evidence. */
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
            Who you are, not what&rsquo;s happening to you. Each line shows how sure we are, and why.
          </p>
          <ul className="mt-5 divide-y divide-rule border-t border-rule">
            {data.person.map((p) => (
              <li key={p.dimension} className="py-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-[16px] font-extrabold tracking-[-0.02em]">
                    {p.dimension}
                    {p.facet === "secondary" ? <Tag kind="plain">Secondary</Tag> : null}
                  </h2>
                  <ConfidenceWord value={p.confidence} />
                </div>
                <div className="mt-2.5">
                  <StrengthBar value={p.strength} label={`${p.dimension} strength`} />
                </div>
                <p className="inferred mt-3 text-[17px] leading-[1.35]">{p.insight}</p>
                <p className="mt-2 text-[12.5px] text-ink3">{p.evidence}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PhoneFrame>
  );
}
