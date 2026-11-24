"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import type { AskTurn, Confidence } from "@idea-district/api-client";

import { AppShell, NavIcon, ReadStrength } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

type Message =
  | { role: "founder"; text: string }
  | { role: "id"; text: string; restsOn: string; strength: Confidence; suggestions: string[] };

const STARTERS = [
  "Should I build a feature one customer is asking for?",
  "How should I price my first plan?",
  "What should I focus on this week?",
];

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember";

/** D2 · Ask ID: a guide that knows the founder's District and helps them think, not decide. */
export function AskIdChat({ founderId }: { founderId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const about = useSearchParams().get("about")?.slice(0, 160) ?? "";
  const starters = about ? [`Help me think through "${about}" for my business`, ...STARTERS.slice(0, 2)] : STARTERS;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function send(text: string) {
    const message = text.trim();
    if (message.length < 2 || sending) return;
    const history: AskTurn[] = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((m) => [...m, { role: "founder", text: message }]);
    setDraft("");
    setError(null);
    setSending(true);
    try {
      const r = await api.askId({ founder_id: founderId, message, history });
      setMessages((m) => [...m, { role: "id", text: r.reply, restsOn: r.rests_on, strength: r.strength, suggestions: r.suggestions }]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(draft);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(draft);
    }
  }

  const composer = (
    <form onSubmit={onSubmit} className="border-t border-rule bg-card px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:rounded-t-[16px] lg:border-x">
      {error ? (
        <p role="alert" className="mb-2 text-[13px] text-ember-deep">
          ID couldn&rsquo;t answer just now. {error}
        </p>
      ) : null}
      <div className="flex items-end gap-2">
        <label htmlFor={inputId} className="sr-only">
          Ask ID
        </label>
        <textarea
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Ask about a decision…"
          className="max-h-32 min-h-[46px] flex-1 resize-none rounded-[12px] border border-rule bg-screen px-4 py-3 text-[15px] leading-snug placeholder:text-ink3 focus:border-ink focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || draft.trim().length < 2}
          aria-label="Send"
          className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[12px] bg-ink text-cream hover:bg-ember hover:text-ink disabled:opacity-40 ${focus}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </form>
  );

  return (
    <AppShell footer={composer}>
      <header className="mb-5 flex items-center gap-3">
        <Link href="/quick-breaks" aria-label="Back to the Quick Breaks room" className={`-ml-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-sand ${focus}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-espresso text-ember-light">
          <NavIcon name="Ask ID" size={20} />
        </span>
        <div>
          <h1 className="text-[18px] font-bold leading-tight">Ask ID</h1>
          <p className="text-[12.5px] text-ink3">Knows your District · private to you</p>
        </div>
      </header>

      <div role="log" aria-live="polite" aria-label="Conversation with ID" className="flex flex-1 flex-col gap-3">
        {messages.length === 0 ? (
          <div className="rounded-[16px] border border-rule bg-card p-5">
            <p className="text-[15px] leading-relaxed">
              Talk a decision through. ID uses only what is in your District, says what each answer rests on, and helps you think rather than telling you what to do.
            </p>
            <p className="mt-4 mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink3">Try one</p>
            <div className="flex flex-wrap gap-2">
              {starters.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className={`min-h-[40px] rounded-full border border-rule bg-screen px-4 text-left text-[14px] font-semibold hover:border-ink ${focus}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m, i) =>
          m.role === "founder" ? (
            <p key={i} className="max-w-[85%] self-end whitespace-pre-line rounded-[16px] rounded-br-[4px] bg-ink px-4 py-3 text-[15px] leading-relaxed text-cream">
              {m.text}
            </p>
          ) : (
            <div key={i} className="flex max-w-[92%] flex-col gap-2 self-start">
              <div className="rounded-[16px] rounded-bl-[4px] border border-rule bg-card px-4 py-3">
                <p className="whitespace-pre-line text-[15px] leading-relaxed">{m.text}</p>
                <p className="mt-3 text-[12.5px] text-ink3">
                  Based on: <span className="inferred">{m.restsOn}</span> · <ReadStrength value={m.strength} />
                </p>
              </div>
              {m.suggestions.length > 0 && i === messages.length - 1 ? (
                <div className="flex flex-wrap gap-2">
                  {m.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className={`min-h-[40px] rounded-full bg-ember-tint px-4 text-[14px] font-semibold text-ink hover:bg-ember ${focus}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ),
        )}

        {sending ? (
          <p className="self-start rounded-[16px] border border-rule bg-card px-4 py-3 text-[14px] text-ink3" aria-live="polite">
            ID is thinking…
          </p>
        ) : null}
        <div ref={endRef} />
      </div>
    </AppShell>
  );
}
