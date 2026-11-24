"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import type { CafeHome as CafeHomeData } from "@idea-district/api-client";

import { AppShell, ErrorNotice } from "@/components/ui";
import { api } from "@/lib/api";
import { useStored } from "@/lib/session";

import { greeting, timeOfDay } from "./scene/palette";
import { SceneBoundary } from "./scene/SceneBoundary";
import { focus, KIND_LABEL, useLoad, whenText } from "./shared";


/** A table in the Cafe room. */
function Table({ href, title, note, highlight = false }: { href: string; title: string; note: string; highlight?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex min-h-[64px] flex-col items-center justify-center rounded-full px-4 text-center shadow-[0_6px_0_#191919] transition-transform hover:-translate-y-0.5 ${highlight ? "bg-ember text-ink" : "bg-cream text-ink"} ${focus}`}
    >
      <span className="text-[12px] font-bold tracking-[0.1em]">{title}</span>
      <span className="text-[12px]">{note}</span>
    </Link>
  );
}

/** The 3D room is loaded only in the browser, and only on this page. */
const CafeScene = dynamic(() => import("./scene/CafeScene"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-5 bg-espresso text-cream">
      <span aria-hidden className="flex gap-2">
        <span className="pixel h-3.5 w-3.5 animate-pulse" />
        <span className="pixel h-3.5 w-3.5 animate-pulse [animation-delay:150ms]" />
        <span className="pixel h-3.5 w-3.5 animate-pulse [animation-delay:300ms]" />
      </span>
      <p className="text-[15px] font-semibold tracking-wide">Opening the cafe door…</p>
    </div>
  ),
});

/* The 3D room or the plain list: a per-browser choice, remembered. */
const VIEW_KEY = "cafe-view";
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
    /* storage blocked: the choice lasts until the page reloads */
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

/** The flat Cafe: shown when a device can't draw the 3D room. */
function FlatRoom({ founderId }: { founderId: string }) {
  const name = useStored("founderName");
  const { data } = useLoad(() => api.cafeHome(founderId), `${founderId}`);
  const brewNote = data?.brew ? (data.brew.my_answer ? "You've answered today" : "Share a thought") : "Back tomorrow";
  const tableNote = data ? (data.tables_open ? `${data.tables_open} open now` : "Pull up a chair") : "Pull up a chair";
  return (
    <>
      <header className="mb-5">
        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ember-deep">The District Cafe · Bengaluru</p>
        <h1 className="mt-1 text-[28px] font-bold tracking-[-0.02em] lg:text-[34px]">
          {greeting(timeOfDay())}
          {name ? `, ${name}` : ""}
        </h1>
      </header>
      <section aria-label="The Cafe room" className="relative overflow-hidden rounded-[20px] bg-ink p-5 text-cream lg:p-8">
        <span aria-hidden className="pixel absolute top-6 right-[38%] hidden h-4 w-4 lg:block" />
        <span aria-hidden className="pixel absolute top-14 right-[34%] hidden h-2.5 w-2.5 lg:block" />
        <span aria-hidden className="absolute right-0 bottom-0 h-24 w-24 bg-espresso" />
        <span aria-hidden className="absolute right-24 bottom-0 h-12 w-12 bg-espresso" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-[0.24em] text-ember-light">THE DISTRICT CAFE</p>
            <p className="mt-2 max-w-[36ch] text-[15px] text-cream/85">Pull up a chair. Think out loud. Meet people when there is a real reason to.</p>
          </div>
          <div className="rounded-[8px] border-2 border-dust bg-espresso px-4 py-3 text-[13px] leading-relaxed">
            <p className="text-[11px] font-bold tracking-[0.14em] text-ember-light">TODAY&rsquo;S MENU</p>
            Daily Brew · Open Table · Quick Breaks
          </div>
        </div>

        <div className="relative mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Table href="/cafe/brew" title="DAILY BREW" note={brewNote} />
          <Table href="/cafe/tables" title="OPEN TABLE" note={tableNote} />
          <Table href="/quick-breaks" title="QUICK BREAKS" note="Your toolkit room" highlight />
        </div>

        <div className="relative mt-8 flex flex-wrap items-center justify-between gap-3">
          <Link href="/district" className={`flex min-h-[44px] items-center gap-2 rounded-[10px] border-2 border-cream px-4 text-[14px] font-bold hover:bg-cream hover:text-ink ${focus}`}>
            Your District <span aria-hidden>↗</span>
          </Link>
          {data && data.here_today > 1 ? (
            <p className="text-[13px] text-cream/80">{data.here_today} founders dropped in today</p>
          ) : null}
        </div>
      </section>
    </>
  );
}

/** B1 · The District Cafe: a room you walk into, full screen. The list view is one tap away. */
export function CafeHome({ founderId }: { founderId: string }) {
  const name = useStored("founderName");
  const view = useView();
  const { data, error, retry } = useLoad(() => api.cafeHome(founderId), `${founderId}`);
  const { data: tables } = useLoad(() => api.cafeTables(founderId), `${founderId}`);
  const list = <CafeList founderId={founderId} data={data} error={error} retry={retry} canWalkIn={view === "list"} />;

  if (view === "list") return list;
  return (
    <SceneBoundary fallback={list}>
      <CafeScene founderId={founderId} name={name ?? null} home={data} tables={tables ?? []} fallback={list} onListView={() => setView("list")} />
    </SceneBoundary>
  );
}

/** The Cafe as a plain page: for anyone who prefers it, and devices that can't draw 3D. */
function CafeList({
  founderId,
  data,
  error,
  retry,
  canWalkIn,
}: {
  founderId: string;
  data: CafeHomeData | null;
  error: string | null;
  retry: () => void;
  canWalkIn: boolean;
}) {
  return (
    <AppShell wide>
      {error ? (
        <div className="mb-4">
          <ErrorNotice message={error} onRetry={retry} />
        </div>
      ) : null}

      <FlatRoom founderId={founderId} />
      {canWalkIn ? (
        <button
          type="button"
          onClick={() => setView("3d")}
          className={`mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[12px] bg-ember text-[15px] font-bold text-ink hover:bg-ink hover:text-cream ${focus}`}
        >
          Walk into the 3D cafe <span aria-hidden>↗</span>
        </button>
      ) : null}

      <h2 className="mt-8 text-[12px] font-bold uppercase tracking-[0.14em] text-ink3">Today&rsquo;s menu</h2>
      <section className="mt-3 grid gap-4 lg:grid-cols-2">
        <Link href="/cafe/brew" className={`rounded-[16px] border border-rule bg-card p-5 hover:border-ink ${focus}`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ember-deep">Today&rsquo;s Daily Brew</p>
          <p className="mt-2 text-[18px] font-bold leading-snug">
            {data ? (data.brew?.question ?? "No question today. A new one tomorrow.") : "…"}
          </p>
          {data?.brew ? (
            <p className="mt-2 text-[13.5px] text-ink3">
              {data.brew.answer_count} {data.brew.answer_count === 1 ? "founder has" : "founders have"} answered
              {data.brew.my_answer ? " · including you" : " · add yours"}
            </p>
          ) : null}
        </Link>

        <div className="rounded-[16px] border border-rule bg-card p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ember-deep">What&rsquo;s on</p>
            <Link href="/cafe/whats-on" className={`text-[13px] font-semibold text-ink2 underline underline-offset-4 hover:text-ink ${focus}`}>
              See all
            </Link>
          </div>
          {data && data.whats_on.length === 0 ? <p className="mt-3 text-[14px] text-ink3">Nothing on the counter this week.</p> : null}
          <ul className="mt-2 divide-y divide-rule2">
            {data?.whats_on.map((w) => (
              <li key={w.id} className="py-2.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink3">
                  {KIND_LABEL[w.kind]}
                  {w.starts_at ? ` · ${whenText(w.starts_at)}` : ""}
                </p>
                <p className="text-[15px] font-semibold">{w.title}</p>
              </li>
            ))}
          </ul>
        </div>

        <Link href="/quick-breaks" className={`rounded-[16px] border border-rule bg-card p-5 hover:border-ink ${focus}`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ember-deep">2-minute warm-up</p>
          <p className="mt-2 text-[18px] font-bold leading-snug">Which assumption about your customers are you least sure of this week?</p>
          <p className="mt-2 text-[13.5px] text-ink3">Take it into the Quick Breaks room and test it.</p>
        </Link>
        <Link href="/cafe/tables" className={`rounded-[16px] border border-rule bg-card p-5 hover:border-ink ${focus}`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ember-deep">Open Table</p>
          <p className="mt-2 text-[18px] font-bold leading-snug">
            {data?.next_table ? `Next: ${data.next_table.title}` : "Topic conversations founders join because the topic matters."}
          </p>
          <p className="mt-2 text-[13.5px] text-ink3">
            {data?.next_table?.starts_at ? whenText(data.next_table.starts_at) : `${data?.tables_open ?? 0} tables open now`}
          </p>
        </Link>
      </section>
    </AppShell>
  );
}
