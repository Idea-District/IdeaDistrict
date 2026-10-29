"use client";

import { useEffect, useRef, useState } from "react";

import type { ChoiceResult, SituationView } from "@idea-district/api-client";

import { Button, ButtonLink, CalmState, ErrorNotice, Heading, Label, PhoneFrame, WhyPanel } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { memory } from "@/lib/session";

import { BuildingId } from "./BuildingId";
import { SignalResult } from "./SignalResult";
import { SituationCard } from "./SituationCard";

/** One optional situation on a gap the founder tapped. No "x of 5", no progress bar. */
export function ProbeFlow({ founderId, probeSessionId }: { founderId: string; probeSessionId: string }) {
  const [situation, setSituation] = useState<SituationView | null>(() =>
    memory.probeSituation?.session_id === probeSessionId ? memory.probeSituation : null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const recoverRef = useRef<Promise<SituationView> | null>(null);

  const [selected, setSelected] = useState<string | null>(null);
  const [why, setWhy] = useState("");
  const shownAt = useRef(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<ChoiceResult | null>(null);
  const [rebuilding, setRebuilding] = useState(false);

  // Reload recovery.
  useEffect(() => {
    if (situation) return;
    recoverRef.current ??= api.currentSituation(probeSessionId);
    let live = true;
    recoverRef.current.then(
      (s) => live && setSituation(s),
      (e) => {
        recoverRef.current = null;
        if (live) setLoadError(errorMessage(e));
      },
    );
    return () => {
      live = false;
    };
  }, [situation, probeSessionId, attempt]);

  // Arriving from a scrolled list: start at the top.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  // Response time is measured from when the options first appear.
  useEffect(() => {
    if (situation && !shownAt.current) shownAt.current = performance.now();
  }, [situation]);

  async function submit() {
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
      setResult(r);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setSubmitError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (rebuilding) return <BuildingId founderId={founderId} />;

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
          <CalmState title="Opening your situation…" />
        )}
      </PhoneFrame>
    );
  }

  if (result) {
    return (
      <PhoneFrame>
        <div className="fade-in flex flex-1 flex-col">
          <Label>Optional situation · {situation.dimension}</Label>
          <Heading className="mt-2">Thanks — that helps.</Heading>
          <SignalResult signal={result.signal} />
          <p className="mt-4 text-[12.5px] leading-relaxed text-ink3">
            One decision does not define you. We look for repeated evidence before treating a pattern as meaningful.
          </p>
          <div className="mt-auto flex flex-col gap-2 pt-8">
            <Button onClick={() => setRebuilding(true)}>Update my ID</Button>
            <ButtonLink href="/id" variant="secondary">
              Back to my ID
            </ButtonLink>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <div className="fade-in flex flex-1 flex-col">
        <Label>Optional situation · {situation.dimension}</Label>
        <WhyPanel label="Why we're asking this" className="mt-4">
          <p>{situation.why_asking}</p>
        </WhyPanel>
        <SituationCard
          situation={situation}
          selected={selected}
          onSelect={setSelected}
          why={why}
          onWhy={setWhy}
          disabled={submitting}
          error={submitError}
        />
        <div className="mt-auto flex flex-col gap-2 pt-8">
          <Button onClick={submit} disabled={!selected || submitting}>
            {submitting ? "Reading your choice…" : submitError ? "Try again" : "Continue"}
          </Button>
          <ButtonLink href="/id" variant="ghost">
            Not now
          </ButtonLink>
        </div>
      </div>
    </PhoneFrame>
  );
}
