"use client";

import { useId, useState, type FormEvent } from "react";

import type { InvestorFounderView, PipelineStage, Room, SharedItem } from "@idea-district/api-client";

import { Button, ErrorNotice, ReadStrength } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { personLine } from "@/lib/format";

import { InvestorShell } from "./InvestorShell";
import { BackLink, card, InvestorEyebrow, inputClass, ROOM_NAMES, SectionTitle, STAGE_NAMES, STAGES, ThesisFit, useLoad, Waiting } from "./parts";

const back = <BackLink href="/investor/pipeline" label="Pipeline" />;

/** I5 · A founder's District as an investor sees it: only rooms they shared, only while opted in. */
export function FounderView({ investorId, founderId }: { investorId: string; founderId: string }) {
  const q = useLoad(() => api.investorFounder(founderId, investorId), `${investorId}:${founderId}`);
  if (!q.data) return <Waiting error={q.error} retry={q.retry} title="Opening their District…" back={back} />;
  const d = q.data;

  return (
    <InvestorShell>
      {back}
      <header className="rounded-[20px] bg-espresso p-5 text-cream lg:p-7">
        <InvestorEyebrow onDark>Their District · only what they shared with investors</InvestorEyebrow>
        <h1 className="mt-2 text-[28px] font-bold leading-[1.1] tracking-[-0.02em]">{d.person.name}</h1>
        <p className="mt-1.5 text-[15px] text-cream/85">{personLine(d.person)}</p>
      </header>

      <div className="mt-4">
        <ThesisFit fit={d.thesis_fit} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {!d.opted_in ? (
            <div className={card}>
              <p className="text-[15px] leading-relaxed text-ink2">
                This founder hasn&rsquo;t opted in to investors, so you see only their public card.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {d.shared.map((room) => (
                <RoomSection key={room} room={room} items={d.rooms[room] ?? []} />
              ))}
              {d.not_shared.map((room) => (
                <div key={room} className="rounded-[16px] border border-dashed border-rule p-4">
                  <h2 className="text-[16px] font-bold text-ink3">{ROOM_NAMES[room]}</h2>
                  <p className="mt-1 text-[13.5px] text-ink3">Not shared</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <PipelineControl investorId={investorId} view={d} />
      </div>
    </InvestorShell>
  );
}

function RoomSection({ room, items }: { room: Room; items: SharedItem[] }) {
  const id = `room-${room}`;
  return (
    <section aria-labelledby={id} className={card}>
      <h2 id={id} className="text-[17px] font-bold text-ink">
        {ROOM_NAMES[room]}
      </h2>
      {room === "capabilities" ? (
        <p className="mt-1 text-[13px] text-ink3">
          <span className="inferred">Italic is what ID worked out</span>, not what they told us.
        </p>
      ) : null}
      {items.length === 0 ? (
        <p className="mt-2 text-[14px] text-ink3">Shared, but nothing in it yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-rule">
          {items.map((it, i) => (
            <li key={i} className="py-2.5 first:pt-1 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink3">{it.label}</p>
                {room === "capabilities" && it.confidence ? <ReadStrength value={it.confidence} /> : null}
              </div>
              <p className={`mt-0.5 leading-snug ${room === "capabilities" ? "inferred text-[15.5px]" : "text-[15px] text-ink"}`}>{it.value}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PipelineControl({ investorId, view }: { investorId: string; view: InvestorFounderView }) {
  const [stage, setStage] = useState<PipelineStage>(view.pipeline?.stage ?? "introduced");
  const [note, setNote] = useState(view.pipeline?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stageId = useId();
  const noteId = useId();

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await api.movePipeline(view.id, investorId, stage, note);
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className={`${card} h-fit`} aria-labelledby="pipeline-heading">
      <SectionTitle id="pipeline-heading">Your pipeline</SectionTitle>
      <label htmlFor={stageId} className="mt-3 mb-1 block text-[13.5px] font-semibold text-ink2">
        Stage
      </label>
      <select id={stageId} value={stage} onChange={(e) => setStage(e.target.value as PipelineStage)} className={inputClass}>
        {STAGES.map((s) => (
          <option key={s} value={s}>
            {STAGE_NAMES[s]}
          </option>
        ))}
      </select>
      <label htmlFor={noteId} className="mt-3 mb-1 block text-[13.5px] font-semibold text-ink2">
        Private note <span className="font-normal text-ink3">(only you see this)</span>
      </label>
      <textarea id={noteId} value={note} onChange={(e) => setNote(e.target.value)} rows={4} className={`${inputClass} resize-y`} />
      {error ? (
        <div className="mt-3">
          <ErrorNotice message={error} />
        </div>
      ) : null}
      <Button type="submit" variant="dark" className="mt-3" disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
      <p role="status" className="mt-2 min-h-[1.25rem] text-[13px] text-ink3">
        {saved ? `Saved. ${view.person.name} is in "${STAGE_NAMES[stage]}".` : ""}
      </p>
    </form>
  );
}
