"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import type { Audience, Room } from "@idea-district/api-client";

import { CalmState, ErrorNotice } from "@/components/ui";
import { api } from "@/lib/api";
import { BackLink, Eyebrow, focus, useLoad } from "@/features/cafe/shared";

export const AUDIENCE_WORDS: Record<Audience, string> = {
  private: "Only you",
  connections: "Your connections",
  community: "The community",
};

export const AUDIENCES: Audience[] = ["private", "connections", "community"];

export const ROOM_NAMES: Record<Room, string> = {
  journey: "Journey",
  business: "Business",
  needs: "Needs & Aspirations",
  progress: "Progress",
  capabilities: "Capabilities",
};

export const ROOMS: Room[] = ["journey", "business", "needs", "progress", "capabilities"];

/** Who can see this room, loaded alongside the room's own data. */
export function useAudience(founderId: string, room: Room): Audience | null {
  const q = useLoad(() => api.district(founderId), founderId);
  return q.data?.visibility[room] ?? null;
}

export function VisibilityChip({ audience }: { audience: Audience | null }) {
  return (
    <Link
      href="/district/visibility"
      className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border border-rule bg-card px-3.5 text-[13px] font-semibold text-ink2 hover:border-ink ${focus}`}
    >
      <span className="sr-only">Who can see this room: </span>
      <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      {audience ? AUDIENCE_WORDS[audience] : "Checking…"}
    </Link>
  );
}

/** Back link, "Room" eyebrow, title and the visibility chip: the same top on every room. */
export function RoomHeader({ title, audience, sub }: { title: string; audience: Audience | null; sub?: ReactNode }) {
  return (
    <>
      <BackLink href="/district" label="My District" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow>Room</Eyebrow>
          <h1 className="mt-1 text-[26px] font-bold tracking-[-0.02em]">{title}</h1>
        </div>
        <VisibilityChip audience={audience} />
      </div>
      {sub ? <div className="mt-2 text-[15px] text-ink2">{sub}</div> : null}
    </>
  );
}

/** Loading or error, with the room header still in place. */
export function RoomWaiting({ title, audience, error, retry, waiting }: { title: string; audience: Audience | null; error: string | null; retry: () => void; waiting: string }) {
  return (
    <>
      <RoomHeader title={title} audience={audience} />
      <div className="mt-6">{error ? <ErrorNotice message={error} onRetry={retry} /> : <CalmState title={waiting} />}</div>
    </>
  );
}

/** A remove/delete control that asks once more before acting. */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  busy = false,
  what,
}: {
  label: string;
  confirmLabel: string;
  /** What is being removed, so screen readers can tell identical buttons apart. */
  what?: string;
  onConfirm: () => void;
  busy?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const small = `min-h-[44px] rounded px-2 text-[13.5px] font-semibold underline underline-offset-4 ${focus}`;
  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} aria-label={what ? `${label}: ${what}` : undefined} className={`${small} text-ink3 hover:text-ink`}>
        {label}
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={onConfirm}
        aria-label={what && !busy ? `${confirmLabel}: ${what}` : undefined}
        className={`${small} text-ember-deep hover:text-ink disabled:opacity-50`}
      >
        {busy ? "Removing…" : confirmLabel}
      </button>
      <button type="button" onClick={() => setArmed(false)} className={`${small} text-ink3 hover:text-ink`}>
        Keep it
      </button>
    </span>
  );
}

/** Today as YYYY-MM-DD in the founder's own time zone. */
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "12 Oct 2026" from a YYYY-MM-DD date, without time-zone drift. */
export function dayText(ymd: string | null | undefined) {
  if (!ymd) return "";
  const [y, m, d] = ymd.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export const fieldClass =
  "mt-1.5 w-full rounded-[12px] border border-rule bg-screen px-4 py-3 text-[15px] leading-relaxed focus:border-ink focus:outline-none";

export const linkClass = `min-h-[44px] rounded px-2 text-[14px] font-semibold text-ink2 underline underline-offset-4 hover:text-ink ${focus}`;

export function ActionError({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="mt-3 text-[13.5px] text-ember-deep">
      {message}
    </p>
  ) : null;
}
