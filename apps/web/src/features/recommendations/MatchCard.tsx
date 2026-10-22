"use client";

import { useState } from "react";

import type { Recommendation } from "@idea-district/api-client";

import { Avatar, Button, ButtonLink, ConfidenceWord, ErrorNotice, Label } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { personLine } from "@/lib/format";

type Match = Extract<Recommendation, { kind: "match" }>;

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
  const [conversationId, setConversationId] = useState<string | null>(null);

  async function respond(response: "accept" | "decline") {
    setBusy(response);
    setError(null);
    try {
      const r = await api.respond(rec.id, { founder_id: founderId, response });
      setConversationId(r.conversation_id ?? null);
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
        <Avatar name={p.name} />
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.03em]">{p.name}</h1>
          <p className="mt-0.5 text-[13px] text-ink3">
            {personLine(p)}
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
          <p className="mt-1.5 text-[14.5px] leading-relaxed">Introduction made — say hello.</p>
          {conversationId ? (
            <ButtonLink href={`/messages/${conversationId}`} className="mt-3">
              Open conversation
            </ButtonLink>
          ) : null}
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
