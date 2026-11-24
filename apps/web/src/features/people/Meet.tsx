"use client";

import Link from "next/link";
import { useState } from "react";

import type { Meet as MeetData } from "@idea-district/api-client";

import { AppShell, Button, CalmState, ErrorNotice, ReadStrength } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { personLine } from "@/lib/format";
import { BackLink, Eyebrow, useLoad } from "@/features/cafe/shared";
import { ActionError, fieldClass } from "@/features/district/rooms";

import { firstName, smallLinkClass } from "./shared";

/** E5 + E6 · Where two journeys could meet (a hypothesis, in words), then an optional request. */
export function Meet({ founderId, personId }: { founderId: string; personId: string }) {
  const q = useLoad(() => api.meet(personId, founderId), `${founderId}:${personId}`);
  const back = <BackLink href={`/people/${personId}`} label="Their District" />;

  if (!q.data) {
    return (
      <AppShell>
        {back}
        {q.error ? (
          <ErrorNotice message={q.error} onRetry={q.retry} />
        ) : (
          <CalmState
            title="Reading where your journeys could meet…"
            sub="ID only looks at what they chose to share. This can take a few seconds."
          />
        )}
      </AppShell>
    );
  }

  const m = q.data;
  const first = firstName(m.person.name);

  return (
    <AppShell>
      {back}
      <Eyebrow>Where journeys meet</Eyebrow>
      <h1 className="mt-1 text-[26px] font-bold leading-[1.15] tracking-[-0.02em]">You and {m.person.name}</h1>
      <p className="mt-1 text-[14px] text-ink2">{personLine(m.person)}</p>

      <article className="mt-5 rounded-[16px] border border-rule bg-card p-4">
        <p className="text-[13px] text-ink3">A hypothesis, not a verdict.</p>
        <dl className="mt-2 flex flex-col gap-4">
          <div>
            <dt className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink3">What you may bring</dt>
            <dd className="inferred mt-1 text-[16px] leading-snug">{m.you_may_bring}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink3">What {first} may bring</dt>
            <dd className="inferred mt-1 text-[16px] leading-snug">{m.they_may_bring}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink3">Why this may matter</dt>
            <dd className="inferred mt-1 text-[16px] leading-snug">{m.why_it_may_matter}</dd>
          </div>
        </dl>
        <p className="mt-4 border-t border-rule pt-3 text-[13px] leading-relaxed text-ink3">
          <ReadStrength value={m.confidence} /> · Based on: {m.rests_on}
        </p>
      </article>

      <p className="mt-4 text-[14px] font-semibold text-ink2">Neither of you is connected automatically.</p>

      <div className="mt-5">
        <RequestBlock founderId={founderId} personId={personId} meet={m} first={first} />
      </div>
    </AppShell>
  );
}

function prefill(m: MeetData, first: string) {
  const raw = m.they_may_bring.replace(/\s+/g, " ").trim().replace(/\.$/, "");
  const bring = /^[A-Z][a-z]/.test(raw) ? raw[0]!.toLowerCase() + raw.slice(1) : raw;
  const short = bring.length > 220 ? `${bring.slice(0, 217).trimEnd()}…` : bring;
  return `Hi ${first}, I visited your District. I think you may bring this to what I'm working on: ${short}. Would you be open to a conversation?`;
}

function RequestBlock({ founderId, personId, meet, first }: { founderId: string; personId: string; meet: MeetData; first: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(() => prefill(meet, first));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (meet.relation === "connected") {
    return (
      <p className="text-[14.5px] text-ink">
        You&rsquo;re already connected.{" "}
        <Link href="/messages" className={smallLinkClass}>
          Go to Messages
        </Link>
      </p>
    );
  }
  if (meet.relation === "request_received") {
    return (
      <p className="text-[14.5px] text-ink">
        {first} has already asked to connect with you.{" "}
        <Link href="/people/connections" className={smallLinkClass}>
          Answer in Connections
        </Link>
      </p>
    );
  }
  if (sent || meet.relation === "request_sent") {
    return (
      <div role="status" className="rounded-[16px] border border-rule bg-card p-4">
        <p className="text-[15.5px] font-bold text-ink">Request sent. Messages open once {first} accepts.</p>
        <Link href="/people/connections" className={`${smallLinkClass} -ml-2 mt-1`}>
          See your connections
        </Link>
      </div>
    );
  }
  if (!open) {
    return (
      <Button className="w-auto" onClick={() => setOpen(true)}>
        Request to connect
      </Button>
    );
  }

  async function send() {
    setBusy(true);
    setError(null);
    try {
      await api.requestConnection({ founder_id: founderId, to_user_id: personId, note: note.trim(), origin: "visitor" });
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="rounded-[16px] border border-rule bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <h2 className="text-[17px] font-bold text-ink">Request to connect</h2>
      <label htmlFor="connect-note" className="mt-3 block text-[14px] font-semibold text-ink">
        A short note to {first}
      </label>
      <textarea
        id="connect-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={5}
        maxLength={600}
        className={`${fieldClass} resize-y`}
        aria-describedby="connect-see"
      />
      <p id="connect-see" className="mt-2 text-[13px] leading-relaxed text-ink3">
        What {first} will see about you: your name, what you&rsquo;re building, stage, city and this note.
      </p>
      <ActionError message={error} />
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit" className="w-auto" disabled={busy || !note.trim()}>
          {busy ? "Sending…" : "Send request"}
        </Button>
        <Button
          variant="secondary"
          className="w-auto"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
