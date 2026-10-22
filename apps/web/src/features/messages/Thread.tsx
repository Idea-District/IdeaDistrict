"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import type { Conversation } from "@idea-district/api-client";

import { AppBar, CalmState, ErrorNotice, PhoneFrame } from "@/components/ui";
import { PendingOutcomes } from "@/features/recommendations/PendingOutcomes";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { personLine, shortDate, shortTime } from "@/lib/format";

const POLL_MS = 15_000;

/** One conversation, opened by an introduction. */
export function Thread({ founderId, conversationId }: { founderId: string; conversationId: string }) {
  const [convo, setConvo] = useState<Conversation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const composerId = useId();

  const load = useCallback(
    () =>
      api.conversation(conversationId, founderId).then(
        (c) => {
          setConvo(c);
          setError(null);
        },
        (e) => setError(errorMessage(e)),
      ),
    [conversationId, founderId],
  );

  // Fetch on show, every 15 s while visible, and when the tab becomes visible again.
  useEffect(() => {
    let live = true;
    const refresh = () => {
      if (live && document.visibilityState === "visible") void load();
    };
    refresh();
    const t = window.setInterval(refresh, POLL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      live = false;
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  const count = convo?.messages.length ?? 0;
  useEffect(() => {
    if (count) endRef.current?.scrollIntoView({ block: "end" });
  }, [count]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const msg = await api.sendMessage(conversationId, founderId, body);
      setConvo((c) => (c && !c.messages.some((m) => m.id === msg.id) ? { ...c, messages: [...c.messages, msg] } : c));
      setDraft("");
    } catch (err) {
      setSendError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  }

  if (!convo) {
    return (
      <PhoneFrame>
        <AppBar backHref="/messages" backLabel="Messages" />
        {error ? <ErrorNotice message={error} onRetry={() => void load()} /> : <CalmState title="Opening the conversation…" />}
      </PhoneFrame>
    );
  }

  const composer = (
    <form onSubmit={send} className="sticky bottom-0 border-t border-rule bg-screen/95 px-4 py-3 backdrop-blur">
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
          placeholder="Say hello…"
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-rule bg-card px-3.5 py-2.5 text-[15px] leading-snug placeholder:text-ink3/80 focus:border-ember focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="h-[44px] shrink-0 rounded-xl bg-ember px-4 text-[14.5px] font-bold text-white transition-opacity disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
        >
          {sending ? "…" : "Send"}
        </button>
      </div>
    </form>
  );

  return (
    <PhoneFrame footer={composer} className="pb-4">
      <AppBar backHref="/messages" backLabel={convo.with.name} />
      <p className="-mt-4 mb-4 text-[12.5px] text-ink3">{personLine(convo.with)}</p>

      <PendingOutcomes founderId={founderId} withName={convo.with.name} className="mb-4" />

      <div className="rounded-r-2xl border-l-[3px] border-ember bg-sand px-[14px] py-[12px]">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ember">
          Introduced {shortDate(convo.introduced_at)}
        </p>
        <p className="inferred mt-1 text-[15.5px] leading-snug">{convo.origin}</p>
      </div>

      <ol className="mt-5 flex flex-col gap-2" aria-label="Messages" aria-live="polite">
        {convo.messages.map((m) => (
          <li key={m.id} className={`flex flex-col ${m.from_me ? "items-end" : "items-start"}`}>
            <p
              className={`max-w-[82%] whitespace-pre-wrap break-words px-3.5 py-2.5 text-[14.5px] leading-snug ${
                m.from_me ? "rounded-2xl rounded-br-[5px] bg-ember text-white" : "rounded-2xl rounded-bl-[5px] bg-sand text-ink"
              }`}
            >
              {m.body}
            </p>
            <span className="mt-0.5 px-1 text-[10.5px] text-ink3">{shortTime(m.sent_at)}</span>
          </li>
        ))}
      </ol>
      {convo.messages.length === 0 ? (
        <p className="mt-4 text-center text-[13px] text-ink3">No messages yet. Say hello.</p>
      ) : null}
      <div ref={endRef} />
    </PhoneFrame>
  );
}
