"use client";

import Link from "next/link";
import { useEffect, useId, useRef, type KeyboardEvent } from "react";

import type { ChatMessage, ConversationSummary } from "@idea-district/api-client";

import { CalmState, ErrorNotice } from "@/components/ui";
import { focus } from "@/features/cafe/shared";
import { personLine, shortDate, shortTime } from "@/lib/format";

import { useThread } from "../useThread";
import type { MSpot } from "./layout";

const cta = `inline-flex min-h-[46px] w-full items-center justify-between gap-2 rounded-[12px] bg-ink px-4 text-[15px] font-bold text-cream hover:bg-ember hover:text-ink ${focus}`;
const eyebrow = "text-[11px] font-bold uppercase tracking-[0.14em] text-ember-deep";
const h2 = "mt-1 text-[21px] font-bold leading-snug tracking-[-0.01em] outline-none";

/** A conversation, read and answered right there on the pier. */
function ThreadHere({ founderId, conversationId, onSent }: { founderId: string; conversationId: string; onSent: (m: ChatMessage) => void }) {
  const { convo, error, load, draft, setDraft, sending, sendError, send } = useThread(founderId, conversationId, onSent);
  const list = useRef<HTMLOListElement>(null);
  const composerId = useId();
  const count = convo?.messages.length ?? 0;
  useEffect(() => {
    const l = list.current;
    if (l) l.scrollTop = l.scrollHeight;
  }, [count]);

  if (!convo) return error ? <ErrorNotice message={error} onRetry={() => void load()} /> : <CalmState title="Opening the conversation…" />;

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h2 className={h2}>{convo.with.name}</h2>
      <p className="text-[12.5px] text-ink3">{personLine(convo.with)}</p>
      <div className="mt-3 rounded-r-2xl border-l-[3px] border-ember bg-sand px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ember-deep">Introduced {shortDate(convo.introduced_at)}</p>
        <p className="inferred mt-0.5 text-[14px] leading-snug">{convo.origin}</p>
      </div>
      <ol ref={list} aria-label="Messages" aria-live="polite" className="mt-3 flex max-h-[34vh] min-h-[80px] flex-col gap-2 overflow-y-auto pr-1 sm:max-h-[40vh]">
        {convo.messages.map((m) => (
          <li key={m.id} className={`flex flex-col ${m.from_me ? "items-end" : "items-start"}`}>
            <p
              className={`max-w-[85%] whitespace-pre-wrap break-words px-3 py-2 text-[14px] leading-snug ${
                m.from_me ? "rounded-2xl rounded-br-[5px] bg-espresso text-cream" : "rounded-2xl rounded-bl-[5px] bg-sand text-ink"
              }`}
            >
              {m.body}
            </p>
            <span className="mt-0.5 px-1 text-[10px] text-ink3">{shortTime(m.sent_at)}</span>
          </li>
        ))}
        {convo.messages.length === 0 ? <li className="py-3 text-center text-[13px] text-ink3">No messages yet. Say hello.</li> : null}
      </ol>
      <form onSubmit={send} className="mt-3">
        {sendError ? (
          <p role="alert" className="mb-2 text-[12.5px] text-ember-deep">
            Not sent. {sendError}
          </p>
        ) : null}
        <div className="flex items-end gap-2">
          <label htmlFor={composerId} className="sr-only">
            Message {convo.with.name}
          </label>
          <textarea
            id={composerId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Write back…"
            className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-rule bg-screen px-3.5 py-2.5 text-[15px] leading-snug placeholder:text-ink3/80 focus:border-ember focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className={`h-[44px] shrink-0 rounded-xl bg-ink px-4 text-[14px] font-bold text-cream hover:bg-ember hover:text-ink disabled:opacity-50 ${focus}`}
          >
            {sending ? "…" : "Send"}
          </button>
        </div>
      </form>
      <Link href={`/messages/${conversationId}`} className={`mt-2 inline-flex min-h-[40px] items-center text-[13px] font-semibold text-ink3 underline underline-offset-4 hover:text-ink ${focus}`}>
        Open the full page
      </Link>
    </div>
  );
}

/** What you find at each place on the pier. */
export function MessagesPanel({
  spot,
  founderId,
  list,
  onSent,
  onBack,
}: {
  spot: Exclude<MSpot, "overview">;
  founderId: string;
  list: ConversationSummary[];
  onSent: (conversationId: string) => void;
  onBack: () => void;
}) {
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => {
    top.current?.focus({ preventScroll: true });
  }, [spot]);

  let body: React.ReactNode;
  if (spot.startsWith("c:")) {
    const id = spot.slice(2);
    body = <ThreadHere key={id} founderId={founderId} conversationId={id} onSent={() => onSent(id)} />;
  } else {
    const unread = list.reduce((n, c) => n + c.unread, 0);
    body = (
      <>
        <p className={eyebrow}>{spot === "letterbox" ? "Your letterbox" : "The bench"}</p>
        <h2 className={h2}>{list.length === 0 ? "No conversations yet" : `${list.length} ${list.length === 1 ? "conversation" : "conversations"}${unread ? `, ${unread} unread` : ""}`}</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink2">
          There&rsquo;s no cold messaging here. A conversation opens only when two founders both say yes to an introduction, and then a new lantern lights over the water.
        </p>
        <div className="mt-5">
          <Link href="/people" className={cta}>
            See who ID suggests <span aria-hidden>↗</span>
          </Link>
        </div>
      </>
    );
  }

  return (
    <aside
      aria-label="On the pier"
      className="cafe-panel absolute inset-x-3 bottom-[72px] z-30 flex max-h-[68%] flex-col overflow-y-auto rounded-[20px] bg-card/97 p-5 text-ink shadow-[0_24px_60px_rgba(25,25,25,0.4)] backdrop-blur sm:inset-x-auto sm:top-[80px] sm:right-5 sm:bottom-auto sm:max-h-[calc(100%-170px)] sm:w-[390px]"
    >
      <div ref={top} tabIndex={-1} className="outline-none">
        <button type="button" onClick={onBack} className={`-ml-1 mb-2 flex min-h-[40px] items-center gap-1.5 rounded text-[14px] font-semibold text-ink3 hover:text-ink ${focus}`}>
          <span aria-hidden>←</span> Back to the pier
        </button>
      </div>
      {body}
    </aside>
  );
}
