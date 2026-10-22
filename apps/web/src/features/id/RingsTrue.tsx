"use client";

import { useState } from "react";

import type { RingsTrue as Answer } from "@idea-district/api-client";

import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

const answers: { value: Answer; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "partly", label: "Partly" },
  { value: "no", label: "No" },
];

/** "Does this ring true?" — the founder's reaction is evidence too, so it goes to the API. */
export function RingsTrue({ founderId, saved }: { founderId: string; saved: Answer | null }) {
  // Local choice overrides what the server had when the page loaded.
  const [choice, setChoice] = useState<Answer | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = choice === undefined ? saved : choice;

  async function pick(a: Answer) {
    if (busy || a === current) return;
    const previous = current;
    setChoice(a);
    setError(null);
    setBusy(true);
    try {
      await api.ringsTrue(founderId, a);
    } catch (e) {
      setChoice(previous);
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-5 rounded-2xl bg-sand px-[15px] py-[14px]" aria-labelledby="ring-true">
      <p id="ring-true" className="text-[14.5px] font-bold">
        Does this ring true?
      </p>
      {current ? <p className="mt-1 text-[13.5px] text-ink2">Thanks — that&rsquo;s evidence too.</p> : null}
      <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="ring-true">
        {answers.map((a) => {
          const on = current === a.value;
          return (
            <button
              key={a.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => pick(a.value)}
              className={`rounded-xl border py-2.5 text-[14px] font-bold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember ${
                on ? "border-ember bg-ember text-white" : "border-rule bg-card text-ink hover:border-ink3"
              }`}
            >
              {a.label}
            </button>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-[13px] text-ember-deep">
          {error}
        </p>
      ) : null}
    </section>
  );
}
