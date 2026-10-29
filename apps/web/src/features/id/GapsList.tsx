"use client";

import { AppBar, CalmState, ErrorNotice, Heading, PhoneFrame, Sub, WhyPanel } from "@/components/ui";

import { GapCards } from "./GapCard";

import { useFounderIdData } from "./useFounderIdData";

/** Screen 12: what the ID still does not know. */
export function GapsList({ founderId }: { founderId: string }) {
  const { data, error, retry } = useFounderIdData(founderId);
  const gaps = data?.gaps.filter((g) => g.status !== "closed") ?? [];

  return (
    <PhoneFrame>
      <AppBar backHref="/id" backLabel="Your ID" title="Still unknown" />
      {!data ? (
        error ? (
          <ErrorNotice message={error} onRetry={retry} />
        ) : (
          <CalmState title="Reading your ID…" />
        )
      ) : (
        <div className="fade-in">
          <Heading>What we still don&rsquo;t know.</Heading>
          <Sub className="mt-2">Each one is optional. Tap one to explore it with a single situation.</Sub>
          {gaps.length === 0 ? (
            <p className="mt-4 text-[15px] text-ink2">No open questions right now.</p>
          ) : (
            <div className="mt-5">
              <GapCards gaps={gaps} founderId={founderId} />
            </div>
          )}
          <WhyPanel label="Your ID is not finished" className="mt-5">
            <p>We don&rsquo;t want to define you from a handful of answers.</p>
          </WhyPanel>
        </div>
      )}
    </PhoneFrame>
  );
}
