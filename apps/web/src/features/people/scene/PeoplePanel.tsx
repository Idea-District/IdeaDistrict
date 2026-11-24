"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import type { Connections, OpportunitySummary, Recommendation } from "@idea-district/api-client";

import { focus } from "@/features/cafe/shared";
import { ROOM_NAMES } from "@/features/district/rooms";
import { KIND_LABEL } from "@/features/opportunities/shared";
import { MatchCard } from "@/features/recommendations/MatchCard";
import { TellMeMore } from "@/features/recommendations/TellMeMore";
import { personLine } from "@/lib/format";

import type { Islander, PSpot } from "./layout";

const cta = `inline-flex min-h-[46px] w-full items-center justify-between gap-2 rounded-[12px] bg-ink px-4 text-[15px] font-bold text-cream hover:bg-ember hover:text-ink ${focus}`;
const ghost = `inline-flex min-h-[44px] w-full items-center justify-between gap-2 rounded-[12px] border-2 border-ink px-4 text-[14px] font-bold text-ink hover:bg-ink hover:text-cream ${focus}`;
const eyebrow = "text-[11px] font-bold uppercase tracking-[0.14em] text-ember-deep";
const h2 = "mt-1 text-[21px] font-bold leading-snug tracking-[-0.01em] outline-none";

/** What you find when you sail over to a place in the archipelago. */
export function PeoplePanel({
  spot,
  founderId,
  rec,
  recError,
  people,
  connections,
  opportunities,
  answering,
  onRespond,
  onLookAgain,
  onBack,
}: {
  spot: Exclude<PSpot, "overview">;
  founderId: string;
  rec: Recommendation | null;
  recError: string | null;
  people: Islander[];
  connections: Connections | null;
  opportunities: OpportunitySummary[];
  answering: string | null;
  onRespond: (requestId: string, accept: boolean) => void;
  onLookAgain: () => void;
  onBack: () => void;
}) {
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => {
    top.current?.focus({ preventScroll: true });
  }, [spot]);

  let body: React.ReactNode;
  if (spot === "you") {
    const n = connections?.connected.length ?? 0;
    const waiting = connections?.received.length ?? 0;
    body = (
      <>
        <p className={eyebrow}>Your island</p>
        <h2 className={h2}>Who&rsquo;s around you</h2>
        <ul className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            [n, n === 1 ? "connection" : "connections"],
            [waiting, waiting === 1 ? "request" : "requests"],
            [people.filter((p) => p.kind === "explore").length, "worth a visit"],
          ].map(([v, l]) => (
            <li key={String(l)} className="rounded-[12px] bg-sand px-2 py-3">
              <p className="text-[22px] font-bold leading-none">{v}</p>
              <p className="mt-1 text-[11.5px] font-semibold text-ink3">{l}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[13.5px] text-ink2">No feed here. Only the few people worth your time right now, and the ones you&rsquo;ve built a bridge to.</p>
        <div className="mt-4 grid gap-2">
          <Link href="/district" className={cta}>
            Your District <span aria-hidden>↗</span>
          </Link>
          <Link href="/people/connections" className={ghost}>
            All your connections <span aria-hidden>›</span>
          </Link>
        </div>
      </>
    );
  } else if (spot === "suggestion") {
    body = !rec ? (
      recError ? (
        <>
          <p className={eyebrow}>The lighthouse</p>
          <h2 className={h2}>ID couldn&rsquo;t look just now</h2>
          <p role="alert" className="mt-2 text-[14px] text-ember-deep">
            {recError}
          </p>
          <button type="button" onClick={onLookAgain} className={`${cta} mt-4`}>
            Try again <span aria-hidden>↻</span>
          </button>
        </>
      ) : (
        <p className="text-[14px] text-ink3">Looking for someone worth your time…</p>
      )
    ) : rec.kind === "match" ? (
      <>
        <p className={`${eyebrow} mb-3`}>The lighthouse · ID&rsquo;s suggestion</p>
        <MatchCard key={rec.id} founderId={founderId} rec={rec} onLookAgain={onLookAgain} />
      </>
    ) : (
      <>
        <p className={eyebrow}>The lighthouse is dark this week</p>
        <h2 className={h2}>Nothing worth your time this week.</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink2">We&rsquo;d rather say that than send you to coffee with someone who can&rsquo;t help.</p>
        {rec.reasons.length > 0 ? (
          <ul className="mt-3 divide-y divide-rule2">
            {rec.reasons.map((r, i) => (
              <li key={i} className="py-2 text-[13.5px] leading-relaxed">
                {r}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-4">
          <TellMeMore founderId={founderId} onLookAgain={onLookAgain} compact />
        </div>
      </>
    );
  } else if (spot === "requests") {
    const received = connections?.received ?? [];
    body = (
      <>
        <p className={eyebrow}>Messages in bottles</p>
        <h2 className={h2}>
          {received.length} {received.length === 1 ? "founder wants" : "founders want"} to connect
        </h2>
        <p className="mt-2 text-[13.5px] text-ink2">Say yes and a bridge goes up between your islands, and messages open.</p>
        <ul className="mt-3 grid gap-2">
          {received.map((r) => (
            <li key={r.id} className="rounded-[14px] border border-rule bg-screen p-4">
              <p className="text-[15px] font-bold">{r.person.name}</p>
              <p className="text-[12.5px] text-ink3">{personLine(r.person)}</p>
              {r.note ? <p className="mt-2 text-[14px] leading-snug">&ldquo;{r.note}&rdquo;</p> : null}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={answering === r.id}
                  onClick={() => onRespond(r.id, false)}
                  className={`min-h-[42px] rounded-[10px] border-2 border-ink text-[13.5px] font-bold hover:bg-sand disabled:opacity-50 ${focus}`}
                >
                  Not now
                </button>
                <button
                  type="button"
                  disabled={answering === r.id}
                  onClick={() => onRespond(r.id, true)}
                  className={`min-h-[42px] rounded-[10px] bg-ink text-[13.5px] font-bold text-cream hover:bg-ember hover:text-ink disabled:opacity-50 ${focus}`}
                >
                  {answering === r.id ? "…" : "Build a bridge"}
                </button>
              </div>
            </li>
          ))}
        </ul>
        {received.length === 0 ? <p className="mt-3 text-[14px] text-ink3">All answered. The water&rsquo;s clear.</p> : null}
      </>
    );
  } else if (spot === "harbour") {
    body = (
      <>
        <p className={eyebrow}>The harbour</p>
        <h2 className={h2}>Ships in with opportunities</h2>
        <p className="mt-2 text-[13.5px] text-ink2">Pilot calls, challenges, problems and circles, posted by people looking for founders like you.</p>
        <ul className="mt-3 grid gap-2">
          {opportunities.slice(0, 5).map((o) => (
            <li key={o.id}>
              <Link href={`/people/opportunities/${o.id}`} className={`block rounded-[12px] border border-rule bg-screen px-4 py-3 hover:border-ink ${focus}`}>
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink3">{KIND_LABEL[o.kind]}</span>
                  {o.for_you ? <span className="rounded-full bg-ember-tint px-2 py-0.5 text-[10.5px] font-bold text-ember-deep">May fit you</span> : null}
                </span>
                <span className="mt-0.5 block text-[15px] font-semibold leading-snug">{o.title}</span>
                <span className="mt-0.5 block text-[12.5px] text-ink3">{o.posted_by}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <Link href="/people/opportunities" className={ghost}>
            Every opportunity <span aria-hidden>›</span>
          </Link>
        </div>
      </>
    );
  } else {
    const who = people.find((p) => `p:${p.id}` === spot);
    body = who ? (
      <>
        <p className={eyebrow}>{who.kind === "explore" ? "Worth a visit this week" : who.kind === "in_talks" ? "In talks" : "Connected"}</p>
        <h2 className={h2}>{who.person.name}</h2>
        <p className="text-[13.5px] text-ink3">{personLine(who.person)}</p>
        {who.reason ? <p className="inferred mt-3 text-[15px] leading-snug">{who.reason}</p> : null}
        {who.shared ? (
          <p className="mt-3 text-[13px] text-ink3">
            {who.shared.length > 0 ? `Shares: ${who.shared.map((r) => ROOM_NAMES[r]).join(", ")}` : "Shares only their public card"}
          </p>
        ) : null}
        <div className="mt-5 grid gap-2">
          {who.conversationId ? (
            <Link href={`/messages/${who.conversationId}`} className={cta}>
              Message {who.person.name.split(" ")[0]} <span aria-hidden>↗</span>
            </Link>
          ) : null}
          <Link href={`/people/${who.id}`} className={who.conversationId ? ghost : cta}>
            Visit their District <span aria-hidden>↗</span>
          </Link>
          <Link href={`/people/${who.id}/meet`} className={ghost}>
            Where your journeys meet <span aria-hidden>›</span>
          </Link>
        </div>
      </>
    ) : (
      <p className="text-[14px] text-ink3">They&rsquo;ve sailed off.</p>
    );
  }

  return (
    <aside
      aria-label="This place in the archipelago"
      className="cafe-panel absolute inset-x-3 bottom-[72px] z-30 max-h-[62%] overflow-y-auto rounded-[20px] bg-card/97 p-5 text-ink shadow-[0_24px_60px_rgba(25,25,25,0.4)] backdrop-blur sm:inset-x-auto sm:top-[80px] sm:right-5 sm:bottom-auto sm:max-h-[calc(100%-170px)] sm:w-[380px]"
    >
      <div ref={top} tabIndex={-1} className="outline-none">
        <button type="button" onClick={onBack} className={`-ml-1 mb-3 flex min-h-[40px] items-center gap-1.5 rounded text-[14px] font-semibold text-ink3 hover:text-ink ${focus}`}>
          <span aria-hidden>←</span> Back to the whole archipelago
        </button>
      </div>
      {body}
    </aside>
  );
}
