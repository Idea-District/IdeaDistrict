"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import type { CafeHome, CafeTable } from "@idea-district/api-client";

import { focus, KIND_LABEL, whenText } from "../shared";
import type { Place } from "./spots";
import { tablesInRoom, tableStatus } from "./Tables";

const cta = `inline-flex min-h-[46px] w-full items-center justify-between gap-2 rounded-[12px] bg-ink px-4 text-[15px] font-bold text-cream hover:bg-ember hover:text-ink ${focus}`;
const ghost = `inline-flex min-h-[44px] w-full items-center justify-between gap-2 rounded-[12px] border-2 border-ink px-4 text-[14px] font-bold text-ink hover:bg-ink hover:text-cream ${focus}`;

function Arrow() {
  return <span aria-hidden>↗</span>;
}

/** What you find when you walk up to a place in the room. */
export function SpotPanel({
  spot,
  home,
  tables,
  onBack,
  onEnter,
  onSelect,
}: {
  spot: Place;
  home: CafeHome | null;
  tables: CafeTable[];
  onBack: () => void;
  /** Walk through a door into that room. */
  onEnter: (door: "quick" | "district") => void;
  onSelect: (place: Place) => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [spot]);

  const brew = home?.brew ?? null;
  const eyebrow = "text-[11px] font-bold uppercase tracking-[0.14em] text-ember-deep";
  const h2 = "mt-1 text-[21px] font-bold leading-snug tracking-[-0.01em] outline-none";

  let body: React.ReactNode;
  if (spot === "counter") {
    body = (
      <>
        <p className={eyebrow}>The counter · Daily Brew</p>
        <h2 ref={heading} tabIndex={-1} className={h2}>
          {home ? (brew?.question ?? "No question today. A new one tomorrow.") : "…"}
        </h2>
        {brew ? (
          <p className="mt-2 text-[14px] text-ink2">
            {brew.answer_count} {brew.answer_count === 1 ? "founder has" : "founders have"} answered
            {brew.my_answer ? ", including you." : ". Add yours: one short answer, no right ones."}
          </p>
        ) : null}
        <div className="mt-5 grid gap-2">
          <Link href="/cafe/brew" className={cta}>
            {brew?.my_answer ? "See what others said" : "Answer today's brew"} <Arrow />
          </Link>
        </div>
      </>
    );
  } else if (spot === "tables") {
    body = (
      <>
        <p className={eyebrow}>The tables · Open Table</p>
        <h2 ref={heading} tabIndex={-1} className={h2}>
          Pull up a chair
        </h2>
        <p className="mt-2 text-[14px] text-ink2">Topic conversations founders join because the topic matters. A lamp is lit over every table that&rsquo;s open now.</p>
        {tables.length === 0 ? <p className="mt-4 text-[14px] text-ink3">No tables set out today.</p> : null}
        <ul className="mt-3 grid gap-2">
          {tablesInRoom(tables).map((t, i) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onSelect(`table-${i}`)}
                className={`flex w-full items-center justify-between gap-3 rounded-[12px] border border-rule bg-screen px-4 py-3 text-left hover:border-ink ${focus}`}
              >
                <span>
                  <span className={`block text-[11px] font-bold uppercase tracking-[0.1em] ${t.status === "open" ? "text-ember-deep" : "text-ink3"}`}>
                    {tableStatus(t)}
                  </span>
                  <span className="mt-0.5 block text-[15px] font-semibold leading-snug">{t.title}</span>
                </span>
                <span aria-hidden className="text-[13px] font-bold text-ink3">Sit ›</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <Link href="/cafe/tables" className={ghost}>
            See every table <Arrow />
          </Link>
        </div>
      </>
    );
  } else if (spot.startsWith("table-")) {
    const t = tablesInRoom(tables)[Number(spot.slice(6))];
    body = t ? (
      <>
        <p className={eyebrow}>Open Table · {tableStatus(t)}</p>
        <h2 ref={heading} tabIndex={-1} className={h2}>
          {t.title}
        </h2>
        <p className="mt-2 text-[14px] text-ink2">{t.prompt}</p>
        <p className="mt-3 text-[13px] text-ink3">
          {t.status === "open"
            ? t.joined
              ? "You're at this table. The others can see what you post here."
              : "There's an empty chair. Pull it up and say what you're working through."
            : "Not open yet. Come back when the lamp is lit."}
        </p>
        <div className="mt-5 grid gap-2">
          <Link href={`/cafe/tables/${t.id}`} className={cta}>
            {t.joined ? "Back to the conversation" : t.status === "open" ? "Pull up a chair" : "See the table"} <Arrow />
          </Link>
          <button type="button" onClick={() => onSelect("tables")} className={ghost}>
            Look at the other tables <span aria-hidden>›</span>
          </button>
        </div>
      </>
    ) : null;
  } else if (spot === "notice") {
    const items = home?.whats_on ?? [];
    body = (
      <>
        <p className={eyebrow}>The noticeboard</p>
        <h2 ref={heading} tabIndex={-1} className={h2}>
          What&rsquo;s on this week
        </h2>
        {home && items.length === 0 ? <p className="mt-3 text-[14px] text-ink3">Nothing pinned this week.</p> : null}
        <ul className="mt-3 divide-y divide-rule2">
          {items.map((w) => (
            <li key={w.id} className="py-2.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink3">
                {KIND_LABEL[w.kind]}
                {w.starts_at ? ` · ${whenText(w.starts_at)}` : ""}
              </p>
              <p className="text-[15px] font-semibold">{w.title}</p>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <Link href="/cafe/whats-on" className={cta}>
            See everything on <Arrow />
          </Link>
        </div>
      </>
    );
  } else if (spot === "quick") {
    body = (
      <>
        <p className={eyebrow}>The back room · Quick Breaks</p>
        <h2 ref={heading} tabIndex={-1} className={h2}>
          Step away and test a thought
        </h2>
        <p className="mt-2 text-[14px] text-ink2">Your toolkit lives behind this door: Ask ID, test an assumption, explore industries. Private unless you save it.</p>
        <div className="mt-4 rounded-[12px] bg-espresso p-4 text-cream">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ember-light">2-minute warm-up</p>
          <p className="mt-1 text-[15px] font-semibold leading-snug">Which assumption about your customers are you least sure of this week?</p>
        </div>
        <div className="mt-4 grid gap-2">
          <button type="button" onClick={() => onEnter("quick")} className={cta}>
            Open the door and go in <Arrow />
          </button>
          <Link href="/ask" className={ghost}>
            Talk it through with ID <Arrow />
          </Link>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <p className={eyebrow}>The side door</p>
        <h2 ref={heading} tabIndex={-1} className={h2}>
          Your District
        </h2>
        <p className="mt-2 text-[14px] text-ink2">Your private space: your ID, your rooms, and room by room, who can see what.</p>
        <div className="mt-5">
          <button type="button" onClick={() => onEnter("district")} className={cta}>
            Open the door and go in <Arrow />
          </button>
        </div>
      </>
    );
  }

  return (
    <aside
      aria-label="This place in the cafe"
      className="cafe-panel absolute inset-x-3 bottom-[72px] z-30 max-h-[60%] overflow-y-auto rounded-[20px] bg-card/97 p-5 text-ink shadow-[0_24px_60px_rgba(25,25,25,0.4)] backdrop-blur sm:inset-x-auto sm:top-[80px] sm:right-5 sm:bottom-auto sm:max-h-[calc(100%-170px)] sm:w-[370px]"
    >
      <button type="button" onClick={onBack} className={`-ml-1 mb-3 flex min-h-[40px] items-center gap-1.5 rounded text-[14px] font-semibold text-ink3 hover:text-ink ${focus}`}>
        <span aria-hidden>←</span> Back to the room
      </button>
      {body}
    </aside>
  );
}
