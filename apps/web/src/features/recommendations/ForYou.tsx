"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Recommendation } from "@idea-district/api-client";

import { CalmState, ErrorNotice, AppShell, Section } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { PeopleLinks } from "@/features/people/PeopleLinks";
import { SceneBoundary } from "@/features/cafe/scene/SceneBoundary";
import { setViewMode, useViewMode } from "@/features/cafe/scene/viewMode";
import { useLoad } from "@/features/cafe/shared";
import { islanders } from "@/features/people/scene/layout";
import { useStored } from "@/lib/session";

import { GapSuggestions } from "./GapSuggestions";
import { MatchCard } from "./MatchCard";
import { PendingOutcomes } from "./PendingOutcomes";
import { TellMeMore } from "./TellMeMore";

/** The 3D archipelago loads only in the browser, and only on this page. */
const PeopleScene = dynamic(() => import("@/features/people/scene/PeopleScene"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-5 bg-espresso text-cream">
      <span aria-hidden className="flex gap-2">
        <span className="pixel h-3.5 w-3.5 animate-pulse" />
        <span className="pixel h-3.5 w-3.5 animate-pulse [animation-delay:150ms]" />
        <span className="pixel h-3.5 w-3.5 animate-pulse [animation-delay:300ms]" />
      </span>
      <p className="text-[15px] font-semibold tracking-wide">Setting sail…</p>
    </div>
  ),
});

const VIEW_KEY = "people-view";

/** Screens 13–14: one intersection, or an honest no-match with Tell me more. */
export function ForYou({ founderId, variant = "real" }: { founderId: string; variant?: "real" | "cozy" }) {
  const view = useViewMode(VIEW_KEY);
  const name = useStored("founderName");
  const conns = useLoad(() => api.connections(founderId), founderId);
  const explore = useLoad(() => api.explore(founderId), founderId);
  const opps = useLoad(() => api.opportunities(founderId), founderId);
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

  const people = useMemo(
    () => islanders(conns.data?.connected ?? [], conns.data?.in_talks ?? [], explore.data?.picks ?? [], rec?.kind === "match" ? rec.person.name : null),
    [conns.data, explore.data, rec],
  );

  const list = (
    <AppShell>
      {view === "list" ? (
        <button
          type="button"
          onClick={() => setViewMode(VIEW_KEY, "3d")}
          className="mb-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[12px] bg-ember text-[15px] font-bold text-ink hover:bg-ink hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
        >
          Sail out to the people around you in 3D <span aria-hidden>↗</span>
        </button>
      ) : null}
      <PeopleLinks founderId={founderId} className="mb-6" />
      <PendingOutcomes founderId={founderId} className="mb-6" />
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
          <GapSuggestions founderId={founderId} />
        </div>
      )}
    </AppShell>
  );

  if (view === "list") return list;
  return (
    <SceneBoundary fallback={list}>
      <PeopleScene
        variant={variant}
        founderId={founderId}
        name={name ?? "You"}
        rec={rec}
        recError={error}
        people={people}
        connections={conns.data}
        opportunities={opps.data ?? []}
        reloadConnections={conns.retry}
        onLookAgain={lookAgain}
        fallback={list}
        onListView={() => setViewMode(VIEW_KEY, "list")}
      />
    </SceneBoundary>
  );
}
