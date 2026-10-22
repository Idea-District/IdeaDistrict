"use client";

import { useEffect, useRef, useState } from "react";

import type { Recommendation } from "@idea-district/api-client";

import { CalmState, ErrorNotice, PhoneFrame, Section, TabBar } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

import { MatchCard } from "./MatchCard";
import { TellMeMore } from "./TellMeMore";

/** Screens 13–14: one intersection, or an honest no-match with Tell me more. */
export function ForYou({ founderId }: { founderId: string }) {
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const loadRef = useRef<Promise<Recommendation> | null>(null);

  // Load once per visit; "Look again" asks explicitly.
  useEffect(() => {
    if (rec) return;
    loadRef.current ??= api.recommendation(founderId);
    let live = true;
    loadRef.current.then(
      (r) => live && setRec(r),
      (e) => {
        loadRef.current = null;
        if (live) setError(errorMessage(e));
      },
    );
    return () => {
      live = false;
    };
  }, [rec, founderId, attempt]);

  function lookAgain() {
    loadRef.current = null;
    setError(null);
    setShowMore(false);
    setRec(null);
    setAttempt((n) => n + 1);
    window.scrollTo({ top: 0 });
  }

  return (
    <PhoneFrame footer={<TabBar />}>
      {!rec ? (
        error ? (
          <ErrorNotice message={error} onRetry={lookAgain} />
        ) : (
          <CalmState title="Looking for someone worth your time…" sub="We only speak up when there's a real reason to." />
        )
      ) : rec.kind === "match" ? (
        <>
          <MatchCard key={rec.id} founderId={founderId} rec={rec} onLookAgain={lookAgain} />
          <div className="mt-8">
            {showMore ? (
              <TellMeMore founderId={founderId} onLookAgain={lookAgain} compact />
            ) : (
              <button
                type="button"
                onClick={() => setShowMore(true)}
                className="w-full rounded text-center text-[13.5px] font-bold text-ink3 underline decoration-rule underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
              >
                Tell me more about you
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="fade-in">
          <div className="py-8 text-center">
            <h1 className="text-[26px] font-extrabold leading-[1.15] tracking-[-0.03em]">Nothing worth your time this week.</h1>
            <p className="mx-auto mt-3 max-w-[320px] text-[15px] leading-relaxed text-ink2">
              We&rsquo;d rather say that than send you to coffee with someone who can&rsquo;t help.
            </p>
          </div>
          {rec.reasons.length > 0 ? (
            <Section title="Why not">
              <ul className="divide-y divide-rule">
                {rec.reasons.map((r, i) => (
                  <li key={i} className="py-2.5 text-[14px] leading-relaxed text-ink first:pt-0 last:pb-0">
                    {r}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
          <div className="mt-5">
            <TellMeMore founderId={founderId} onLookAgain={lookAgain} />
          </div>
        </div>
      )}
    </PhoneFrame>
  );
}
