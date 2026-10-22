"use client";

import { useState } from "react";

import type { Recommendation } from "@idea-district/api-client";

import { Button, ConfidenceWord, ErrorNotice, Label } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

type Match = Extract<Recommendation, { kind: "match" }>;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

function Explain({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-3.5">
      <Label as="h3">{label}</Label>
      <div className="mt-1.5 text-[14.5px] leading-relaxed text-ink">{children}</div>
    </div>
  );
}

/** Screen 13: someone you should meet — a hypothesis with four explanations. */
export function MatchCard({ founderId, rec, onLookAgain }: { founderId: string; rec: Match; onLookAgain: () => void }) {
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [done, setDone] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(response: "accept" | "decline") {
    setBusy(response);
    setError(null);
    try {
      await api.respond(rec.id, { founder_id: founderId, response });
      setDone(response);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const p = rec.person;
  return (
    <div className="fade-in">
      <Label>Someone you should meet</Label>
      <span className="mt-3 inline-block rounded-full bg-ember-tint px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-ember-deep">
        {rec.match_type}
      </span>

      <div className="mt-4 flex items-center gap-3.5">
        <div aria-hidden className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-espresso text-[17px] font-extrabold text-cream">
          {initials(p.name)}
        </div>
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.03em]">{p.name}</h1>
          <p className="mt-0.5 text-[13px] text-ink3">
            {[p.building, p.stage, p.city].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <div className="mt-5 divide-y divide-rule border-y border-rule">
        <Explain label="Why now">{rec.why_now}</Explain>
        <Explain label="Why them">{rec.why_them}</Explain>
        <Explain label="What could happen">{rec.what_could_happen}</Explain>
        <Explain label="How confident">
          <ConfidenceWord value={rec.confidence} className="mr-2" />
          {rec.confidence_reason}
        </Explain>
      </div>

      {error ? (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      ) : null}

      {done === "accept" ? (
        <div role="status" className="fade-in mt-5 rounded-2xl bg-sand px-[15px] py-[14px]">
          <Label>Introduction requested</Label>
          <p className="mt-1.5 text-[14.5px] leading-relaxed">Introduction requested — we&rsquo;ll let you both know.</p>
        </div>
      ) : done === "decline" ? (
        <div role="status" className="fade-in mt-5 rounded-2xl bg-sand px-[15px] py-[14px]">
          <p className="text-[14.5px] leading-relaxed">Got it. Not now is a useful answer too.</p>
          <Button variant="secondary" className="mt-3" onClick={onLookAgain}>
            Look again
          </Button>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="secondary" disabled={busy !== null} onClick={() => respond("decline")}>
            {busy === "decline" ? "…" : "Not now"}
          </Button>
          <Button disabled={busy !== null} onClick={() => respond("accept")}>
            {busy === "accept" ? "Asking…" : "Introduce us"}
          </Button>
        </div>
      )}
    </div>
  );
}
