"use client";

import { useState } from "react";

import type { OutcomeInput, OutcomeResult, PendingOutcome } from "@idea-district/api-client";

import { Button, ErrorNotice, Label, Tag } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { shortDate } from "@/lib/format";

type Useful = NonNullable<OutcomeInput["was_useful"]>;
type Again = NonNullable<OutcomeInput["will_talk_again"]>;

function Chips<T extends string | boolean>({
  question,
  options,
  value,
  disabled,
  onPick,
}: {
  question: string;
  options: { value: T; label: string }[];
  value: T | null;
  disabled: boolean;
  onPick: (v: T) => void;
}) {
  return (
    <fieldset className="mt-4">
      <legend className="text-[14px] font-bold">{question}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button
              key={String(o.value)}
              type="button"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => onPick(o.value)}
              className={`rounded-full border px-4 py-2 text-[13.5px] font-bold transition-colors duration-150 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember ${
                on ? "border-ember bg-ember text-white" : "border-rule bg-card text-ink hover:border-ink3"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** "Did that go anywhere?" — three taps; submits by itself once the needed taps are in. */
export function OutcomeSurvey({
  founderId,
  outcome,
  onDone,
}: {
  founderId: string;
  outcome: PendingOutcome;
  onDone: () => void;
}) {
  const [didMeet, setDidMeet] = useState<boolean | null>(null);
  const [useful, setUseful] = useState<Useful | null>(null);
  const [again, setAgain] = useState<Again | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OutcomeResult | null>(null);

  async function submit(input: OutcomeInput) {
    setBusy(true);
    setError(null);
    try {
      setResult(await api.reportOutcome(outcome.recommendation_id, input));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function inputFor(m: boolean | null, u: Useful | null, a: Again | null): OutcomeInput | null {
    if (m === false) return { founder_id: founderId, did_meet: false, was_useful: null, will_talk_again: null };
    if (m === true && u && a) return { founder_id: founderId, did_meet: true, was_useful: u, will_talk_again: a };
    return null;
  }

  function pick(m: boolean | null, u: Useful | null, a: Again | null) {
    setDidMeet(m);
    setUseful(u);
    setAgain(a);
    const ready = inputFor(m, u, a);
    if (ready) void submit(ready);
  }

  const name = outcome.with.name;

  if (result) {
    return (
      <section className="fade-in rounded-2xl bg-card px-[15px] py-[15px] ring-1 ring-rule" aria-live="polite">
        <Label tone="neutral">About {name}</Label>
        <div className="mt-3 border-l-[3px] border-ember py-1 pl-4">
          <div className="flex items-center gap-2">
            <Label>What this changed</Label>
            {result.validated ? <Tag kind="observed">Validated</Tag> : null}
          </div>
          <p className="inferred mt-2 text-[18px] leading-[1.35]">{result.what_changed}</p>
        </div>
        <Button variant="secondary" className="mt-4" onClick={onDone}>
          Done
        </Button>
      </section>
    );
  }

  const ready = inputFor(didMeet, useful, again);

  return (
    <section className="rounded-2xl bg-card px-[15px] py-[15px] ring-1 ring-rule">
      <div className="flex items-baseline justify-between gap-3">
        <Label tone="neutral">About {name}</Label>
        <span className="text-[11.5px] text-ink3">Introduced {shortDate(outcome.introduced_at)}</span>
      </div>
      <h2 className="mt-2 text-[21px] font-extrabold tracking-[-0.03em]">Did that go anywhere?</h2>
      <p className="mt-1 text-[13.5px] text-ink2">Three taps. It makes the next one better.</p>

      <Chips<boolean>
        question="Did you two actually meet?"
        options={[
          { value: true, label: "Yes" },
          { value: false, label: "No" },
        ]}
        value={didMeet}
        disabled={busy}
        onPick={(v) => pick(v, v ? useful : null, v ? again : null)}
      />
      {didMeet ? (
        <>
          <Chips<Useful>
            question="Was it worth the hour?"
            options={[
              { value: "not_really", label: "Not really" },
              { value: "yes", label: "Yes" },
              { value: "very", label: "Very" },
            ]}
            value={useful}
            disabled={busy}
            onPick={(v) => pick(didMeet, v, again)}
          />
          <Chips<Again>
            question="Will you talk again?"
            options={[
              { value: "already", label: "Already have" },
              { value: "maybe", label: "Maybe" },
              { value: "no", label: "No" },
            ]}
            value={again}
            disabled={busy}
            onPick={(v) => pick(didMeet, useful, v)}
          />
        </>
      ) : null}

      {busy ? (
        <p role="status" className="mt-4 text-[13px] text-ink3">
          Sending…
        </p>
      ) : null}
      {error ? (
        <div className="mt-4">
          <ErrorNotice message={error} onRetry={ready ? () => void submit(ready) : undefined} />
        </div>
      ) : null}
    </section>
  );
}
