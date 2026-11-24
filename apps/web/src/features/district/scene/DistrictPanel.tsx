"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import type { Audience, DistrictOverview, FounderID, Room } from "@idea-district/api-client";

import { ReadStrength } from "@/components/ui";
import { focus } from "@/features/cafe/shared";

import { ROOM_LABEL } from "./Buildings";
import type { DSpot } from "./layout";
import { orbitItems } from "./Monument";

const cta = `inline-flex min-h-[46px] w-full items-center justify-between gap-2 rounded-[12px] bg-ink px-4 text-[15px] font-bold text-cream hover:bg-ember hover:text-ink ${focus}`;
const ghost = `inline-flex min-h-[44px] w-full items-center justify-between gap-2 rounded-[12px] border-2 border-ink px-4 text-[14px] font-bold text-ink hover:bg-ink hover:text-cream ${focus}`;
const eyebrow = "text-[11px] font-bold uppercase tracking-[0.14em] text-ember-deep";
const h2 = "mt-1 text-[21px] font-bold leading-snug tracking-[-0.01em] outline-none";

const HREF: Record<Room, string> = {
  journey: "/district/journey",
  business: "/district/business",
  needs: "/district/needs",
  progress: "/district/progress",
  capabilities: "/district/capabilities",
};

const AUDIENCE: { id: Audience; label: string; what: string }[] = [
  { id: "private", label: "Only you", what: "A tall hedge all round. Nobody else sees in." },
  { id: "connections", label: "Connections", what: "A low fence. People you're connected with can look in." },
  { id: "community", label: "Community", what: "No fence. Any founder visiting your District can see it." },
];

function summary(room: Room, d: DistrictOverview | null) {
  const r = d?.rooms[room];
  if (!r) return "…";
  const n = r.count;
  switch (room) {
    case "journey":
      return r.latest ? `${n} ${n === 1 ? "step" : "steps"} so far. Latest: ${r.latest}` : "No milestones yet. Add the first one.";
    case "business":
      return r.latest ?? "Tell us what you're building.";
    case "needs":
      return r.latest ? `Right now: ${r.latest}` : "What would help most right now?";
    case "progress":
      return r.latest ? `Running: ${r.latest}. ${n} ${n === 1 ? "experiment" : "experiments"} in the glasshouse.` : `${n} ${n === 1 ? "experiment" : "experiments"} so far.`;
    case "capabilities":
      return `${n} ${n === 1 ? "read" : "reads"} of what you can offer, in words.`;
  }
}

/** What you find when you fly over to a place in your District. */
export function DistrictPanel({
  spot,
  id,
  overview,
  saving,
  onAudience,
  onBack,
}: {
  spot: Exclude<DSpot, "overview">;
  id: FounderID;
  overview: DistrictOverview | null;
  saving: Room | null;
  onAudience: (room: Room, a: Audience) => void;
  onBack: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [spot]);

  let body: React.ReactNode;
  if (spot === "id") {
    const strongest = [...id.person].sort((a, b) => b.strength - a.strength)[0];
    body = (
      <>
        <p className={eyebrow}>The plaza · Your ID</p>
        <h2 ref={heading} tabIndex={-1} className={h2}>
          {id.founder.name}&rsquo;s ID
        </h2>
        <p className="inferred mt-2 text-[15px] leading-snug">{id.headline}</p>
        <ul className="mt-4 divide-y divide-rule2">
          {orbitItems(id).map((it, i) => (
            <li key={i} className="py-2.5">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink3">{it.label}</p>
              <p className={`text-[14px] leading-snug ${it.inferred ? "inferred" : ""}`}>{it.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12.5px] text-ink3">
          Plain is what you told us. <span className="inferred">Italic is how we read you.</span>
          {strongest ? (
            <>
              {" "}Strongest read: <ReadStrength value={strongest.confidence} />
            </>
          ) : null}
        </p>
        <div className="mt-5 grid gap-2">
          <Link href="/you" className={cta}>
            See your whole ID <span aria-hidden>↗</span>
          </Link>
        </div>
      </>
    );
  } else if (spot === "unknowns") {
    const open = id.gaps.filter((g) => g.status !== "closed");
    body = (
      <>
        <p className={eyebrow}>The fog · What we don&rsquo;t know yet</p>
        <h2 ref={heading} tabIndex={-1} className={h2}>
          {open.length} open {open.length === 1 ? "question" : "questions"}
        </h2>
        <p className="mt-2 text-[14px] text-ink2">Your ID says what it doesn&rsquo;t know. Each answer clears a patch of fog and makes introductions sharper.</p>
        <ul className="mt-3 grid gap-2">
          {open.slice(0, 3).map((g) => (
            <li key={g.id} className="rounded-[12px] border border-rule bg-screen px-4 py-3">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink3">{g.dimension}</p>
              <p className="mt-0.5 text-[14.5px] font-semibold leading-snug">{g.question}</p>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <Link href="/id/gaps" className={cta}>
            Answer one <span aria-hidden>↗</span>
          </Link>
        </div>
      </>
    );
  } else {
    const room = spot;
    const current = overview?.visibility[room] ?? null;
    body = (
      <>
        <p className={eyebrow}>Room</p>
        <h2 ref={heading} tabIndex={-1} className={h2}>
          {ROOM_LABEL[room]}
        </h2>
        <p className="mt-2 text-[14.5px] leading-snug text-ink2">{summary(room, overview)}</p>

        <fieldset className="mt-5">
          <legend className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink3">Who can see this room</legend>
          <div className="mt-2 grid grid-cols-3 gap-1 rounded-[12px] bg-sand p-1">
            {AUDIENCE.map((a) => {
              const on = current === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={on}
                  disabled={saving === room}
                  onClick={() => onAudience(room, a.id)}
                  className={`min-h-[40px] rounded-[9px] px-1 text-[12.5px] font-bold transition-colors disabled:opacity-60 ${focus} ${on ? "bg-ink text-cream" : "text-ink2 hover:bg-cream"}`}
                >
                  {a.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[12.5px] text-ink3" aria-live="polite">
            {saving === room ? "Saving…" : current ? AUDIENCE.find((a) => a.id === current)?.what : ""}
          </p>
        </fieldset>

        <div className="mt-5 grid gap-2">
          <Link href={HREF[room]} className={cta}>
            Go inside <span aria-hidden>↗</span>
          </Link>
          <Link href="/district/visibility" className={ghost}>
            Every room, and investors <span aria-hidden>›</span>
          </Link>
        </div>
      </>
    );
  }

  return (
    <aside
      aria-label="This place in your District"
      className="cafe-panel absolute inset-x-3 bottom-[72px] z-30 max-h-[60%] overflow-y-auto rounded-[20px] bg-card/97 p-5 text-ink shadow-[0_24px_60px_rgba(25,25,25,0.4)] backdrop-blur sm:inset-x-auto sm:top-[80px] sm:right-5 sm:bottom-auto sm:max-h-[calc(100%-170px)] sm:w-[370px]"
    >
      <button type="button" onClick={onBack} className={`-ml-1 mb-3 flex min-h-[40px] items-center gap-1.5 rounded text-[14px] font-semibold text-ink3 hover:text-ink ${focus}`}>
        <span aria-hidden>←</span> Back to the whole District
      </button>
      {body}
    </aside>
  );
}
