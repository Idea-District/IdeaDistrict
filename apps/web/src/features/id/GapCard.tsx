"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Gap } from "@idea-district/api-client";

import { CalmState, Label } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { memory, session } from "@/lib/session";

/**
 * An unknown the founder can choose to explore: tapping it writes one optional situation
 * aimed at this gap and opens it.
 */
export function GapCard({ gap, founderId }: { gap: Gap; founderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function explore() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const probe = await api.probeGap(gap.id, founderId);
      memory.probeSituation = probe;
      // Stored with the situation id so a repeat probe on the same session still starts fresh.
      session.setProbeSessionId(`${probe.session_id}|${probe.situation_id}`);
      router.push("/discover/probe");
      // Leave the overlay up until the probe screen replaces this one.
      window.setTimeout(() => setBusy(false), 1500);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={explore}
        disabled={busy}
        className="group w-full rounded-2xl border border-rule bg-card px-[15px] pt-[14px] pb-0 text-left transition-colors duration-150 hover:border-ink3 disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
      >
        <Label>What we don&rsquo;t know yet</Label>
        <span className="mt-1.5 block text-[15.5px] font-extrabold leading-snug tracking-[-0.01em] text-ink">{gap.question}</span>
        <span className="mt-1 block text-[13px] leading-relaxed text-ink2">{gap.why_it_matters}</span>
        <span className="mt-3 flex items-center justify-between border-t border-rule py-2.5 text-[12.5px] font-bold text-ink3 group-hover:text-ink">
          {gap.status === "probing" ? "Explored once · explore again" : "One optional situation"}
          <span aria-hidden className="text-[16px] text-ember">
            →
          </span>
        </span>
      </button>
      {error ? (
        <p role="alert" className="mt-2 px-1 text-[12.5px] text-ember-deep">
          {error}
        </p>
      ) : null}
      {busy ? (
        <div className="fixed inset-0 z-50 flex justify-center bg-cream/95 backdrop-blur-sm">
          <div className="flex w-full max-w-[420px] flex-col px-4">
            <CalmState title="Writing a situation for you…" sub={`About ${gap.dimension.toLowerCase()}. This takes a few seconds.`} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Open gaps as cards (closed ones are already understood). */
export function GapCards({ gaps, founderId, limit }: { gaps: Gap[]; founderId: string; limit?: number }) {
  const open = gaps.filter((g) => g.status !== "closed").slice(0, limit ?? Infinity);
  if (open.length === 0) return null;
  return (
    <ul className="flex flex-col gap-3">
      {open.map((g) => (
        <li key={g.id}>
          <GapCard gap={g} founderId={founderId} />
        </li>
      ))}
    </ul>
  );
}
