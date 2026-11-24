"use client";

import { createContext, useCallback, useContext, useId, useState, type ReactNode } from "react";

import { adminErrorMessage, isAuthError, type AdminApi } from "@/lib/adminApi";

export const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember";

export const inputClass = `w-full min-h-[44px] rounded-[10px] border border-rule bg-card px-3 py-2.5 text-[15px] text-ink placeholder:text-ink3 disabled:cursor-not-allowed disabled:opacity-60 ${focus}`;

type SmallVariant = "secondary" | "primary" | "dark" | "danger";

const smallVariants: Record<SmallVariant, string> = {
  secondary: "border border-rule bg-card text-ink hover:bg-sand2",
  primary: "bg-ember text-ink hover:bg-[#e83c02]",
  dark: "bg-espresso text-cream hover:bg-espresso2",
  danger: "border border-ember-deep/40 bg-card text-ember-deep hover:bg-ember-tint",
};

/** A compact row action that still meets the 44px touch target. */
export function smallButton(variant: SmallVariant = "secondary", className = "") {
  return `inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-[10px] px-3.5 text-[14px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${smallVariants[variant]} ${focus} ${className}`;
}

/** A labelled form field. The render prop gets the input id and the hint id. */
export function Field({
  label,
  hint,
  optional = false,
  children,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  children: (props: { id: string; "aria-describedby"?: string }) => ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13.5px] font-bold text-ink">
        {label}
        {optional ? <span className="font-semibold text-ink3"> (optional)</span> : null}
      </label>
      {children({ id, "aria-describedby": hint ? hintId : undefined })}
      {hint ? (
        <p id={hintId} className="text-[12.5px] text-ink3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[16px] border border-rule bg-card p-4 sm:p-5 ${className}`}>{children}</div>;
}

/** A small caps tag, readable at a glance. */
export function Pill({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "ember" | "forest" | "muted" | "tint" }) {
  const tones = {
    plain: "bg-rule text-ink",
    ember: "bg-ember text-ink",
    forest: "bg-espresso text-cream",
    muted: "bg-sand2 text-ink2",
    tint: "bg-ember-tint text-ember-deep",
  } as const;
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-[3px] text-[10.5px] font-bold uppercase leading-none tracking-[0.08em] ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** A calm, polite confirmation line after a save. */
export function Saved({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="rounded-[10px] bg-sand2 px-3 py-2 text-[13.5px] font-semibold text-ink">
      {children}
    </p>
  );
}

// ── Dates ──────────────────────────────────────────────────────────────

/** The API sometimes sends naive ISO times (no zone); they are UTC. */
function parseIso(iso: string) {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
}

/** "2026-11-20" → "Fri 20 Nov" (a calendar day, so no time-zone shift). With the year: "Fri 20 Nov 2026". */
export function dayLabel(isoDate: string, withYear = false) {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  const day = new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  return withYear ? `${day} ${y}` : day;
}

/** An ISO datetime → "Fri 20 Nov, 18:30" (time in the viewer's locale). */
export function whenLabel(iso: string | null | undefined) {
  if (!iso) return null;
  const d = parseIso(iso);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${day}, ${time}`;
}

/** A `datetime-local` value (local wall time) → an ISO string, or undefined when empty. */
export function localToIso(value: string) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

// ── Shared console context ─────────────────────────────────────────────

type AdminContextValue = {
  client: AdminApi;
  today: string;
  /** Refetches the overview; never throws. */
  refresh: () => Promise<void>;
  /** The token was rejected: sign out and show the gate with this message. */
  onAuthLost: (message: string) => void;
};

const AdminContext = createContext<AdminContextValue | null>(null);
export const AdminProvider = AdminContext.Provider;

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside the Cafe admin console.");
  return ctx;
}

/**
 * Runs one admin change: tracks which control is busy, shows errors inline,
 * signs out on a 401 and refetches the overview after a success.
 */
export function useAdminAction() {
  const { client, refresh, onAuthLost } = useAdmin();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async <T,>(key: string, fn: (c: AdminApi) => Promise<T>, opts: { refresh?: boolean } = {}): Promise<T | undefined> => {
      setBusy(key);
      setError(null);
      try {
        const result = await fn(client);
        if (opts.refresh !== false) await refresh();
        return result;
      } catch (e) {
        if (isAuthError(e)) onAuthLost(adminErrorMessage(e));
        else setError(adminErrorMessage(e));
        return undefined;
      } finally {
        setBusy(null);
      }
    },
    [client, refresh, onAuthLost],
  );

  return { busy, error, run, clearError: () => setError(null) };
}
