"use client";

import Link from "next/link";
import { useId, useState } from "react";

import type { PipelineCard, PipelineStage } from "@idea-district/api-client";

import { ErrorNotice } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { personLine } from "@/lib/format";

import { InvestorShell } from "./InvestorShell";
import { card, focus, inputClass, PageTitle, PersonDot, STAGE_NAMES, STAGES, useLoad, Waiting } from "./parts";

/** I6 · The pipeline: founders by stage, each movable. */
export function PipelineScreen({ investorId }: { investorId: string }) {
  const q = useLoad(() => api.pipeline(investorId), investorId);
  const [tab, setTab] = useState<PipelineStage>("introduced");
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);

  if (!q.data) return <Waiting error={q.error} retry={q.retry} title="Opening your pipeline…" />;
  const p = q.data;
  const list = p[tab] ?? [];

  async function move(c: PipelineCard, stage: PipelineStage) {
    setMoving(c.founder_id);
    setError(null);
    try {
      q.setData(await api.movePipeline(c.founder_id, investorId, stage));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setMoving(null);
    }
  }

  return (
    <InvestorShell>
      <PageTitle title="Pipeline" sub="Founders who introduced themselves to you, by stage. Notes are private to you." />

      <div role="tablist" aria-label="Pipeline stages" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {STAGES.map((s) => {
          const on = s === tab;
          return (
            <button
              key={s}
              type="button"
              role="tab"
              id={`tab-${s}`}
              aria-selected={on}
              aria-controls="stage-panel"
              onClick={() => setTab(s)}
              className={`min-h-[44px] shrink-0 rounded-full border px-4 text-[14px] font-semibold ${focus} ${
                on ? "border-espresso bg-espresso text-cream" : "border-rule bg-card text-ink2 hover:border-ink"
              }`}
            >
              {STAGE_NAMES[s]} <span className={on ? "text-ember-light" : "text-ink3"}>{(p[s] ?? []).length}</span>
            </button>
          );
        })}
      </div>

      {error ? (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      ) : null}

      <div id="stage-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-5">
        {list.length === 0 ? (
          <div className={card}>
            <p className="text-[15px] text-ink2">No founders in &ldquo;{STAGE_NAMES[tab]}&rdquo;.</p>
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {list.map((c) => (
              <FounderCard key={c.founder_id} c={c} stage={tab} busy={moving === c.founder_id} onMove={(s) => void move(c, s)} />
            ))}
          </ul>
        )}
      </div>
    </InvestorShell>
  );
}

function FounderCard({ c, stage, busy, onMove }: { c: PipelineCard; stage: PipelineStage; busy: boolean; onMove: (s: PipelineStage) => void }) {
  const selectId = useId();
  return (
    <li className={`${card} min-w-0`}>
      <Link href={`/investor/founders/${c.founder_id}`} className={`flex min-h-[44px] min-w-0 items-center gap-3 rounded ${focus}`}>
        <PersonDot person={c.person} size={40} />
        <span className="min-w-0">
          <span className="block truncate text-[16px] font-bold text-ink underline-offset-4 hover:underline">{c.person.name}</span>
          <span className="block truncate text-[13px] text-ink3">{personLine(c.person)}</span>
        </span>
      </Link>
      {c.note ? <p className="mt-2 text-[14px] text-ink2">{c.note}</p> : null}
      <div className="mt-3 flex items-center gap-2">
        <label htmlFor={selectId} className="shrink-0 text-[13px] font-semibold text-ink2">
          Move to
        </label>
        <select
          id={selectId}
          value={stage}
          disabled={busy}
          onChange={(e) => onMove(e.target.value as PipelineStage)}
          className={`${inputClass} min-w-0 py-2`}
          aria-label={`Move ${c.person.name} to stage`}
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_NAMES[s]}
            </option>
          ))}
        </select>
      </div>
    </li>
  );
}
