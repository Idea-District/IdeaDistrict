"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { CafePerson, WhatsOnItem } from "@idea-district/api-client";

import { errorMessage } from "@/lib/errors";
import { initials, shortDate, shortTime } from "@/lib/format";

export const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={`-ml-1 mb-3 flex min-h-[44px] w-fit items-center gap-1.5 rounded text-[14px] font-semibold text-ink3 hover:text-ink ${focus}`}>
      <span aria-hidden>←</span> {label}
    </Link>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ember-deep">{children}</p>;
}

/* Warm, distinct circles for members, picked from the brand palette by name. */
const DOTS = ["bg-ember text-ink", "bg-espresso text-cream", "bg-dust text-cream", "bg-ink text-cream", "bg-sand text-ink"];

export function PersonDot({ person, size = 36 }: { person: Pick<CafePerson, "name">; size?: number }) {
  const n = [...person.name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${DOTS[n % DOTS.length]}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {initials(person.name)}
    </span>
  );
}

export function whenText(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  return `${day} · ${shortTime(iso)}`;
}

export function postedText(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString() ? shortTime(iso) : shortDate(iso);
}

export const KIND_LABEL: Record<WhatsOnItem["kind"], string> = { event: "Event", open_call: "Open call", table: "New table" };

/** Load on mount (and whenever `key` changes) with retry. `setData` lets a screen apply
 *  the server's reply to an action without a second round trip. */
export function useLoad<T>(load: () => Promise<T>, key: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [n, setN] = useState(0);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let live = true;
    loadRef.current().then(
      (d) => {
        if (!live) return;
        setData(d);
        setError(null);
      },
      (e) => live && setError(errorMessage(e)),
    );
    return () => {
      live = false;
    };
  }, [key, n]);

  return { data, setData, error, retry: () => setN((x) => x + 1) };
}
