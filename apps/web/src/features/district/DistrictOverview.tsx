"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import type { Audience, DistrictOverview, FounderID } from "@idea-district/api-client";

import { AppShell, ButtonLink, CalmState, ErrorNotice, ReadStrength } from "@/components/ui";
import { useFounderIdData } from "@/features/id/useFounderIdData";
import { SceneBoundary } from "@/features/cafe/scene/SceneBoundary";
import { api } from "@/lib/api";

/** The 3D District loads only in the browser, and only on this page. */
const DistrictScene = dynamic(() => import("./scene/DistrictScene"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-5 bg-espresso text-cream">
      <span aria-hidden className="flex gap-2">
        <span className="pixel h-3.5 w-3.5 animate-pulse" />
        <span className="pixel h-3.5 w-3.5 animate-pulse [animation-delay:150ms]" />
        <span className="pixel h-3.5 w-3.5 animate-pulse [animation-delay:300ms]" />
      </span>
      <p className="text-[15px] font-semibold tracking-wide">Flying over your District…</p>
    </div>
  ),
});

/* 3D or the plain page: a per-browser choice, remembered. */
const VIEW_KEY = "district-view";
const viewListeners = new Set<() => void>();
function readView(): "3d" | "list" {
  try {
    return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "3d";
  } catch {
    return "3d";
  }
}
function setView(v: "3d" | "list") {
  try {
    localStorage.setItem(VIEW_KEY, v);
  } catch {
    /* storage blocked: lasts until reload */
  }
  viewListeners.forEach((l) => l());
}
function useView() {
  return useSyncExternalStore(
    (l) => {
      viewListeners.add(l);
      return () => viewListeners.delete(l);
    },
    readView,
    () => "3d" as const,
  );
}

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember";

type Orbit = { label: string; text: string; inferred: boolean };

/** Up to six things around the founder: what they told us (State) and how we read them (Person). */
function orbitItems(data: FounderID): Orbit[] {
  const state = data.state.slice(0, 3).map((s) => ({ label: s.field, text: s.value, inferred: false }));
  const person = [...data.person]
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 6 - state.length)
    .map((p) => ({ label: p.dimension, text: p.insight, inferred: true }));
  return [...state, ...person];
}

/* Positions around the centre, as % of the map box: top, right-top, right-bottom, bottom, left-bottom, left-top. */
const spots = [
  "left-1/2 top-0 -translate-x-1/2 text-center items-center",
  "right-0 top-[24%] text-right items-end",
  "right-0 bottom-[18%] text-right items-end",
  "left-1/2 bottom-0 -translate-x-1/2 text-center items-center",
  "left-0 bottom-[18%] items-start",
  "left-0 top-[24%] items-start",
];

function OrbitMap({ data }: { data: FounderID }) {
  const items = orbitItems(data);
  return (
    <div className="relative mx-auto h-[320px] w-full max-w-[560px] sm:h-[380px]">
      <div aria-hidden className="absolute top-1/2 left-1/2 h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cream/20 sm:h-[300px] sm:w-[300px]" />
      <div aria-hidden className="absolute top-1/2 left-1/2 h-[170px] w-[170px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-cream/30 sm:h-[200px] sm:w-[200px]" />
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 flex h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ember text-[30px] font-bold text-ink shadow-[0_0_0_6px_rgba(235,236,220,0.12)]"
      >
        {data.founder.name.slice(0, 1).toUpperCase()}
      </div>
      <span aria-hidden className="pixel absolute top-[12%] right-[22%] h-3 w-3" />
      <span aria-hidden className="pixel absolute bottom-[30%] left-[26%] h-2 w-2" />
      <ul className="contents">
        {items.map((it, i) => (
          <li key={`${it.label}-${i}`} className={`absolute flex max-w-[36%] flex-col gap-0.5 sm:max-w-[30%] ${spots[i]}`}>
            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ember-light">{it.label}</span>
            <span className={`line-clamp-3 text-[13px] leading-snug ${it.inferred ? "italic text-cream/90" : "text-cream"}`}>
              {it.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const AUDIENCE_WORD: Record<Audience, string> = { private: "Only you", connections: "Your connections", community: "The community" };

type RoomCard = { name: string; note: string; href: string; audience?: Audience };

function roomCards(data: FounderID, d: DistrictOverview | null): RoomCard[] {
  const open = data.gaps.filter((g) => g.status !== "closed").length;
  const r = d?.rooms;
  const v = d?.visibility;
  const count = (n: number | undefined, one: string, many: string) => (n === undefined ? "" : `${n} ${n === 1 ? one : many}`);
  return [
    { name: "Journey", href: "/district/journey", audience: v?.journey,
      note: r?.journey.latest ? `Latest: ${r.journey.latest}` : "Milestones and decisions" },
    { name: "Business", href: "/district/business", audience: v?.business,
      note: r?.business.latest ?? "What you're building, right now" },
    { name: "Needs & Aspirations", href: "/district/needs", audience: v?.needs,
      note: r?.needs.latest ? `Now: ${r.needs.latest}` : "What would help most" },
    { name: "Progress", href: "/district/progress", audience: v?.progress,
      note: r?.progress.latest ? `Running: ${r.progress.latest}` : count(r?.progress.count, "experiment", "experiments") || "Experiments and outcomes" },
    { name: "Capabilities", href: "/district/capabilities", audience: v?.capabilities,
      note: count(r?.capabilities.count, "read", "reads") || "What you can offer, in words" },
    { name: "What we don't know yet", href: "/id/gaps", note: open ? `${open} open ${open === 1 ? "question" : "questions"}` : "Nothing open right now" },
    { name: "What others can see", href: "/district/visibility", note: "Choose, room by room" },
  ];
}

/** C1 · My District: the orbit map on Forest Green, then the rooms. */
export function DistrictOverview({ founderId }: { founderId: string }) {
  const { data, error, retry } = useFounderIdData(founderId);
  const [rooms, setRooms] = useState<DistrictOverview | null>(null);
  const view = useView();

  useEffect(() => {
    let live = true;
    api.district(founderId).then(
      (d) => live && setRooms(d),
      () => {}, // the cards still work without counts
    );
    return () => {
      live = false;
    };
  }, [founderId]);

  if (!data) {
    return (
      <AppShell>{error ? <ErrorNotice message={error} onRetry={retry} /> : <CalmState title="Opening your District…" />}</AppShell>
    );
  }

  if (!data.built_at) {
    return (
      <AppShell>
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">Your District isn&rsquo;t built yet.</h1>
        <p className="mt-2 text-[15px] text-ink2">Finish the five situations and we&rsquo;ll put it together.</p>
        <div className="mt-8 flex max-w-sm flex-col gap-2">
          <ButtonLink href="/id/building">Build my District now</ButtonLink>
          <ButtonLink href="/discover" variant="ghost">
            Back to the situations
          </ButtonLink>
        </div>
      </AppShell>
    );
  }

  const list = <DistrictList data={data} rooms={rooms} canFlyIn={view === "list"} />;
  if (view === "list") return list;
  return (
    <SceneBoundary fallback={list}>
      <DistrictScene founderId={founderId} id={data} overview={rooms} setOverview={setRooms} fallback={list} onListView={() => setView("list")} />
    </SceneBoundary>
  );
}

/** The District as a plain page: for anyone who prefers it, and devices that can't draw 3D. */
function DistrictList({ data, rooms, canFlyIn }: { data: FounderID; rooms: DistrictOverview | null; canFlyIn: boolean }) {
  const strongest = [...data.person].sort((a, b) => b.strength - a.strength)[0];

  return (
    <AppShell wide>
      <section className="-mx-5 -mt-7 bg-espresso px-5 pt-7 pb-8 text-cream lg:mx-0 lg:mt-0 lg:rounded-[20px] lg:px-10 lg:pt-9">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ember-light">Your private space</p>
        <h1 className="mt-1 text-[28px] font-bold tracking-[-0.02em] lg:text-[34px]">{data.founder.name}&rsquo;s District</h1>
        <p className="mt-2 max-w-[60ch] text-[15px] italic text-cream/85">{data.headline}</p>
        <div className="mt-6">
          <OrbitMap data={data} />
        </div>
        <p className="mt-4 text-[12.5px] text-cream/70">
          Plain text is what you told us. <span className="italic">Italic is how we read you</span>
          {strongest ? (
            <>
              {" "}· strongest read: <ReadStrength value={strongest.confidence} className="text-ember-light" />
            </>
          ) : null}
        </p>
      </section>

      {canFlyIn ? (
        <button
          type="button"
          onClick={() => setView("3d")}
          className={`mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[12px] bg-ember text-[15px] font-bold text-ink hover:bg-ink hover:text-cream ${focus}`}
        >
          Fly over your District in 3D <span aria-hidden>↗</span>
        </button>
      ) : null}

      <h2 className="mt-8 mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-ink3">Rooms</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {roomCards(data, rooms).map((r) => (
          <li key={r.name}>
            <Link
              href={r.href}
              className={`flex min-h-[72px] items-center justify-between gap-3 rounded-[12px] border border-rule bg-card px-4 py-3 hover:border-ink ${focus}`}
            >
              <span className="flex min-w-0 flex-col">
                <span className="text-[15px] font-bold">{r.name}</span>
                <span className="line-clamp-1 text-[12.5px] text-ink3">{r.note}</span>
                {r.audience ? <span className="mt-1 text-[11.5px] font-semibold text-ink2">Seen by: {AUDIENCE_WORD[r.audience]}</span> : null}
              </span>
              <span aria-hidden className="text-ember-deep">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
