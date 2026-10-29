"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { ChoiceResult, SituationView } from "@idea-district/api-client";

import { Button, CalmState, ErrorNotice, Heading, Label, PhoneFrame, ProgressBar, Section, WhyPanel } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { memory } from "@/lib/session";

import { SignalResult } from "./SignalResult";
import { SituationCard } from "./SituationCard";

type Phase = "why" | "situation" | "signal";

/** Screens 5–8: why-we're-asking → situation → signal captured, for each situation. */
export function DiscoverFlow({ founderId, sessionId }: { founderId: string; sessionId: string }) {
  const router = useRouter();

  const [situation, setSituation] = useState<SituationView | null>(() =>
    memory.firstSituation?.session_id === sessionId ? memory.firstSituation : null,
  );
  const [phase, setPhase] = useState<Phase>("why");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const recoverRef = useRef<Promise<SituationView> | null>(null);

  const [selected, setSelected] = useState<string | null>(null);
  const [why, setWhy] = useState("");
  const shownAt = useRef(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<ChoiceResult | null>(null);

  // The next situation, requested in the background as soon as a choice lands.
  const nextRef = useRef<Promise<SituationView> | null>(null);
  const [waitingNext, setWaitingNext] = useState(false);
  const [nextError, setNextError] = useState<string | null>(null);

  // Reload recovery: ask the API where this session is.
  useEffect(() => {
    if (situation) return;
    recoverRef.current ??= api.currentSituation(sessionId);
    let active = true;
    recoverRef.current.then(
      (s) => {
        if (!active) return;
        setSituation(s);
        setPhase("why");
      },
      (e) => {
        recoverRef.current = null;
        if (active) setLoadError(errorMessage(e));
      },
    );
    return () => {
      active = false;
    };
  }, [situation, sessionId, attempt]);

  function showSituation() {
    shownAt.current = performance.now();
    setPhase("situation");
    window.scrollTo({ top: 0 });
  }

  function prefetchNext() {
    const p = api.nextSituation(sessionId);
    p.catch(() => undefined); // handled when awaited
    nextRef.current = p;
  }

  async function submitChoice() {
    if (!situation || !selected) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const r = await api.choose(situation.situation_id, {
        founder_id: founderId,
        option_id: selected,
        why: why.trim() || undefined,
        response_time_ms: Math.max(0, Math.round(performance.now() - shownAt.current)),
      });
      if (!r.done) prefetchNext();
      setResult(r);
      setPhase("signal");
      window.scrollTo({ top: 0 });
    } catch (e) {
      setSubmitError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function goNext() {
    if (!result) return;
    if (result.done) {
      router.push("/id/building");
      return;
    }
    if (!nextRef.current) prefetchNext();
    setWaitingNext(true);
    setNextError(null);
    try {
      const next = await nextRef.current!;
      nextRef.current = null;
      memory.firstSituation = null;
      setSituation(next);
      setSelected(null);
      setWhy("");
      setResult(null);
      setPhase("why");
      window.scrollTo({ top: 0 });
    } catch (e) {
      nextRef.current = null;
      setNextError(errorMessage(e));
    } finally {
      setWaitingNext(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────
  if (!situation) {
    return (
      <PhoneFrame>
        {loadError ? (
          <ErrorNotice
            message={loadError}
            onRetry={() => {
              setLoadError(null);
              setAttempt((n) => n + 1);
            }}
          />
        ) : (
          <CalmState title="Finding where you left off…" />
        )}
      </PhoneFrame>
    );
  }

  const n = situation.sequence_no;
  const total = situation.total;
  const progress = phase === "signal" ? n / total : (n - 0.5) / total;

  if (waitingNext) {
    return (
      <PhoneFrame>
        <ProgressBar value={progress} label="Discovery progress" />
        <CalmState title="Finding the next useful discovery…" sub="Aimed at what we still don't know about you." />
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <ProgressBar value={progress} label="Discovery progress" />

      {phase === "why" ? (
        <div key={`why-${n}`} className="fade-in flex flex-1 flex-col">
          {situation.consequence ? (
            <Section title="What happened" className="mt-6">
              <p className="text-[14.5px] leading-relaxed text-ink">{situation.consequence}</p>
            </Section>
          ) : null}
          <Label className="mt-6">Discovery · {situation.dimension}</Label>
          <Heading className="mt-2">Let&rsquo;s discover something useful.</Heading>
          <WhyPanel label="Why we're asking this" className="mt-5">
            <p>{situation.why_asking}</p>
          </WhyPanel>
          <Section title="We won't ask you everything" className="mt-3">
            <p className="text-[14px] leading-relaxed text-ink2">
              Only what could help us understand you and become more useful to you.
            </p>
          </Section>
          <div className="mt-auto pt-8">
            <Button variant="dark" onClick={showSituation}>
              Continue
            </Button>
          </div>
        </div>
      ) : null}

      {phase === "situation" ? (
        <div key={`sit-${n}`} className="fade-in flex flex-1 flex-col">
          <Label className="mt-6">
            Situation {n} of {total}
          </Label>
          <SituationCard
            situation={situation}
            selected={selected}
            onSelect={setSelected}
            why={why}
            onWhy={setWhy}
            disabled={submitting}
            error={submitError}
          />

          <div className="mt-auto pt-8">
            <Button onClick={submitChoice} disabled={!selected || submitting}>
              {submitting ? "Reading your choice…" : submitError ? "Try again" : "Continue"}
            </Button>
          </div>
        </div>
      ) : null}

      {phase === "signal" && result ? (
        <div key={`sig-${n}`} className="fade-in flex flex-1 flex-col">
          <Label className="mt-6">New signal detected</Label>
          <Heading className="mt-2">Your ID is evolving.</Heading>

          <SignalResult signal={result.signal} />

          <Section title="What changed" className="mt-3">
            <p className="text-[14px] leading-relaxed text-ink2">
              We learned from what you chose to do, not from what you told us about yourself.
            </p>
          </Section>
          <p className="mt-4 text-[12.5px] leading-relaxed text-ink3">
            One decision does not define you. We look for repeated evidence before treating a pattern as meaningful.
          </p>

          {nextError ? (
            <div className="mt-4">
              <ErrorNotice message={nextError} />
            </div>
          ) : null}

          <div className="mt-auto pt-8">
            <Button onClick={goNext}>
              {result.done ? "See my ID" : nextError ? "Try again" : "Find the next useful discovery"}
            </Button>
          </div>
        </div>
      ) : null}
    </PhoneFrame>
  );
}
