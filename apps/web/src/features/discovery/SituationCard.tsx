"use client";

import { useId } from "react";

import type { SituationView } from "@idea-district/api-client";

import { ErrorNotice } from "@/components/ui";

const letter = (i: number) => String.fromCharCode(65 + i);

/** A situation, its question, options A–E and the optional "why". Shared by discovery and probes. */
export function SituationCard({
  situation,
  selected,
  onSelect,
  why,
  onWhy,
  disabled,
  error,
}: {
  situation: SituationView;
  selected: string | null;
  onSelect: (optionId: string) => void;
  why: string;
  onWhy: (v: string) => void;
  disabled: boolean;
  error: string | null;
}) {
  const whyId = useId();
  return (
    <>
      <p className="mt-4 text-[23px] font-extrabold leading-[1.25] tracking-[-0.025em]">{situation.situation}</p>
      <p className="mt-5 text-[15px] font-bold text-ink2">{situation.question}</p>

      <div role="radiogroup" aria-label={situation.question} className="mt-3 flex flex-col gap-2">
        {situation.options.map((o, i) => {
          const on = selected === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={disabled}
              onClick={() => onSelect(o.id)}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-[15px] leading-snug transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember ${
                on ? "border-ember bg-ember text-white" : "border-rule bg-card text-ink hover:border-ink3"
              }`}
            >
              <span className={`w-4 shrink-0 font-bold ${on ? "text-white" : "text-ink3"}`}>{letter(i)}</span>
              <span>{o.text}</span>
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="fade-in mt-5">
          <label htmlFor={whyId} className="mb-1.5 block text-[12.5px] font-bold text-ink3">
            Why? (optional)
          </label>
          <input
            id={whyId}
            value={why}
            onChange={(e) => onWhy(e.target.value)}
            maxLength={280}
            placeholder="One line, if you like"
            className="w-full rounded-xl border border-rule bg-card px-3.5 py-2.5 text-[14.5px] placeholder:text-ink3/80 focus:border-ember focus:outline-none"
          />
        </div>
      ) : null}

      {error ? (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      ) : null}
    </>
  );
}
