import type { SignalView } from "@idea-district/api-client";

import { Label, Section, Tag } from "@/components/ui";

/** What one choice might suggest — hedged, with what it can't tell us yet. No scores. */
export function SignalResult({ signal }: { signal: SignalView }) {
  const n = signal.decisions_so_far;
  return (
    <>
      <div className="mt-5 border-l-[3px] border-ember py-1 pl-4">
        <Label>What this might suggest</Label>
        <p className="inferred mt-2 text-[21px] leading-[1.3]">{signal.text}</p>
        <p className="mt-3 text-[12.5px] text-ink3">{signal.evidence}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Tag kind="observed">Early signal</Tag>
          <span className="text-[12px] text-ink3">
            From {n} {n === 1 ? "decision" : "decisions"}
          </span>
        </div>
      </div>

      {signal.still_unclear ? (
        <Section title="Still unclear" className="mt-5">
          <p className="text-[14.5px] leading-relaxed text-ink">{signal.still_unclear}</p>
        </Section>
      ) : null}
    </>
  );
}
