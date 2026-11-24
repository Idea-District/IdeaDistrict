"use client";

import Link from "next/link";
import { useState } from "react";

import type { ConnectionItem, ConnectionRequestItem } from "@idea-district/api-client";

import { AppShell, Button, CalmState, ErrorNotice } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { shortDate } from "@/lib/format";
import { BackLink, Eyebrow, PersonDot, focus, useLoad } from "@/features/cafe/shared";
import { ActionError, ConfirmButton } from "@/features/district/rooms";

import { PersonText, smallLinkClass } from "./shared";

type Tab = "connected" | "in_talks" | "requests";
const TABS: { id: Tab; label: string }[] = [
  { id: "connected", label: "Connected" },
  { id: "in_talks", label: "In talks" },
  { id: "requests", label: "Requests" },
];

/** E7 · Who you're connected to, who you're talking with, and requests both ways. */
export function ConnectionsScreen({ founderId }: { founderId: string }) {
  const q = useLoad(() => api.connections(founderId), founderId);
  const [picked, setPicked] = useState<Tab | null>(null);

  if (!q.data) {
    return (
      <AppShell>
        <BackLink href="/people" label="People" />
        {q.error ? <ErrorNotice message={q.error} onRetry={q.retry} /> : <CalmState title="Gathering your connections…" />}
      </AppShell>
    );
  }

  const c = q.data;
  const tab: Tab = picked ?? (c.received.length > 0 ? "requests" : "connected");
  const counts: Record<Tab, number> = {
    connected: c.connected.length,
    in_talks: c.in_talks.length,
    requests: c.received.length + c.sent.length,
  };

  function onKey(e: React.KeyboardEvent, i: number) {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = TABS[(i + d + TABS.length) % TABS.length]!.id;
    setPicked(next);
    document.getElementById(`tab-${next}`)?.focus();
  }

  return (
    <AppShell>
      <BackLink href="/people" label="People" />
      <Eyebrow>People</Eyebrow>
      <h1 className="mt-1 text-[26px] font-bold tracking-[-0.02em]">Connections</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink2">Messages open only when both of you agree.</p>

      <div role="tablist" aria-label="Connections" className="mt-5 flex gap-1 rounded-[12px] bg-sand p-1">
        {TABS.map((t, i) => {
          const on = t.id === tab;
          return (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`panel-${t.id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => setPicked(t.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-[9px] px-2 text-[14px] font-bold ${on ? "bg-card text-ink shadow-sm" : "text-ink3 hover:text-ink"} ${focus}`}
            >
              {t.label}
              {counts[t.id] > 0 ? <span className={on ? "text-ink3" : ""}>{counts[t.id]}</span> : null}
            </button>
          );
        })}
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-5">
        {tab === "connected" ? (
          <PeopleList rows={c.connected} empty="No connections yet. When someone accepts your request, or you accept theirs, they appear here." />
        ) : tab === "in_talks" ? (
          <PeopleList rows={c.in_talks} empty="No one you've messaged in the last week." />
        ) : (
          <Requests founderId={founderId} received={c.received} sent={c.sent} />
        )}
      </div>
    </AppShell>
  );
}

function PeopleList({ rows, empty }: { rows: ConnectionItem[]; empty: string }) {
  if (rows.length === 0) return <p className="text-[14.5px] leading-relaxed text-ink3">{empty}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.person_id} className="flex flex-wrap items-center gap-3 rounded-[16px] border border-rule bg-card p-4">
          <PersonDot person={r.person} />
          <div className="min-w-0 flex-1">
            <PersonText person={r.person} />
            {r.last_message_at ? <p className="mt-0.5 text-[12.5px] text-ink3">Last message {shortDate(r.last_message_at)}</p> : null}
          </div>
          {r.conversation_id ? (
            <Link href={`/messages/${r.conversation_id}`} className={smallLinkClass}>
              Message<span className="sr-only"> {r.person.name}</span>
            </Link>
          ) : (
            <Link href={`/people/${r.person_id}`} className={smallLinkClass}>
              Visit District<span className="sr-only"> of {r.person.name}</span>
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

type Outcome = { kind: "accepted"; conversationId: string | null } | { kind: "declined" } | { kind: "withdrawn" };

function Requests({ founderId, received, sent }: { founderId: string; received: ConnectionRequestItem[]; sent: ConnectionRequestItem[] }) {
  const [done, setDone] = useState<Record<string, Outcome>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function act(id: string, run: () => Promise<ConnectionRequestItem>, outcome: (r: ConnectionRequestItem) => Outcome) {
    setBusy(id);
    setErrors((e) => ({ ...e, [id]: "" }));
    try {
      const r = await run();
      setDone((d) => ({ ...d, [id]: outcome(r) }));
    } catch (e) {
      setErrors((x) => ({ ...x, [id]: errorMessage(e) }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <section aria-labelledby="received-h">
        <h2 id="received-h" className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink3">
          Received
        </h2>
        {received.length === 0 ? (
          <p className="mt-2 text-[14.5px] text-ink3">No one is waiting on an answer from you.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {received.map((r) => {
              const o = done[r.id];
              return (
                <li key={r.id} className="rounded-[16px] border border-rule bg-card p-4">
                  <div className="flex items-start gap-3">
                    <PersonDot person={r.person} />
                    <div className="min-w-0 flex-1">
                      <PersonText person={r.person} as="h3" />
                      <p className="mt-0.5 text-[12.5px] text-ink3">Asked {shortDate(r.sent_at)}</p>
                    </div>
                  </div>
                  {r.note ? <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink">{r.note}</p> : null}
                  {o?.kind === "accepted" ? (
                    <p role="status" className="mt-3 text-[14.5px] font-semibold text-ink">
                      You&rsquo;re connected. Messages are open.{" "}
                      <Link href={o.conversationId ? `/messages/${o.conversationId}` : "/messages"} className={smallLinkClass}>
                        Open the conversation
                      </Link>
                    </p>
                  ) : o?.kind === "declined" ? (
                    <p role="status" className="mt-3 text-[14.5px] text-ink2">
                      Declined. No messages will open.
                    </p>
                  ) : (
                    <>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          className="w-auto"
                          disabled={busy === r.id}
                          onClick={() =>
                            act(r.id, () => api.respondToRequest(r.id, founderId, true), (x) => ({ kind: "accepted", conversationId: x.conversation_id ?? null }))
                          }
                        >
                          Accept<span className="sr-only"> {r.person.name}</span>
                        </Button>
                        <Button
                          variant="secondary"
                          className="w-auto"
                          disabled={busy === r.id}
                          onClick={() => act(r.id, () => api.respondToRequest(r.id, founderId, false), () => ({ kind: "declined" }))}
                        >
                          Decline<span className="sr-only"> {r.person.name}</span>
                        </Button>
                      </div>
                      <ActionError message={errors[r.id] || null} />
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="sent-h">
        <h2 id="sent-h" className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink3">
          Sent
        </h2>
        {sent.length === 0 ? (
          <p className="mt-2 text-[14.5px] text-ink3">You haven&rsquo;t asked anyone to connect.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {sent.map((r) => (
              <li key={r.id} className="rounded-[16px] border border-rule bg-card p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <PersonDot person={r.person} />
                  <div className="min-w-0 flex-1">
                    <PersonText person={r.person} as="h3" />
                    <p className="mt-0.5 text-[12.5px] text-ink3">Sent {shortDate(r.sent_at)}</p>
                  </div>
                  {done[r.id]?.kind === "withdrawn" ? (
                    <p role="status" className="text-[14px] text-ink2">
                      Withdrawn
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="rounded-full bg-sand px-3 py-1 text-[12.5px] font-bold text-ink2">Waiting</span>
                      <ConfirmButton
                        label="Withdraw"
                        confirmLabel="Yes, withdraw"
                        what={`request to ${r.person.name}`}
                        busy={busy === r.id}
                        onConfirm={() => act(r.id, () => api.withdrawRequest(r.id, founderId), () => ({ kind: "withdrawn" }))}
                      />
                    </div>
                  )}
                </div>
                <ActionError message={errors[r.id] || null} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
