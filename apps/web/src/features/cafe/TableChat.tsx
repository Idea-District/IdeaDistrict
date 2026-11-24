"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { AppShell, CalmState, ErrorNotice, buttonClass } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

import { BackLink, Eyebrow, focus, PersonDot, postedText, useLoad, whenText } from "./shared";

const REFRESH_MS = 8000;

/** B5 · A table's conversation. Refreshes quietly every few seconds while open. */
export function TableChat({ founderId, tableId }: { founderId: string; tableId: string }) {
  const { data, setData, error, retry } = useLoad(() => api.cafeTable(tableId, founderId), `${tableId}:${founderId}`);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const postCount = data?.posts.length ?? 0;

  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      api.cafeTable(tableId, founderId).then(setData, () => {});
    }, REFRESH_MS);
    return () => window.clearInterval(t);
  }, [tableId, founderId, setData]);

  useEffect(() => {
    if (postCount) endRef.current?.scrollIntoView({ block: "end" });
  }, [postCount]);

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const send = () =>
    act(async () => {
      const body = draft.trim();
      if (!body) return;
      setData(await api.postToTable(tableId, founderId, body));
      setDraft("");
    });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  if (!data) {
    return (
      <AppShell>
        <BackLink href="/cafe/tables" label="Open Table" />
        {error ? <ErrorNotice message={error} onRetry={retry} /> : <CalmState title="Finding your table…" />}
      </AppShell>
    );
  }

  const open = data.status === "open";

  const composer = open ? (
    <form onSubmit={onSubmit} className="border-t border-rule bg-card px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:rounded-t-[16px] lg:border-x">
      {actionError ? (
        <p role="alert" className="mb-2 text-[13px] text-ember-deep">
          {actionError}
        </p>
      ) : null}
      <div className="flex items-end gap-2">
        <label htmlFor={inputId} className="sr-only">
          Post to {data.title}
        </label>
        <textarea
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={1200}
          placeholder={data.joined ? "Add to the conversation…" : "Say something to join the table…"}
          className="max-h-32 min-h-[46px] flex-1 resize-none rounded-[12px] border border-rule bg-screen px-4 py-3 text-[15px] leading-snug placeholder:text-ink3 focus:border-ink focus:outline-none"
        />
        <button type="submit" disabled={busy || !draft.trim()} className={`h-[46px] shrink-0 rounded-[12px] bg-ink px-4 text-[14.5px] font-bold text-cream hover:bg-ember hover:text-ink disabled:opacity-40 ${focus}`}>
          Post
        </button>
      </div>
    </form>
  ) : undefined;

  return (
    <AppShell footer={composer}>
      <BackLink href="/cafe/tables" label="Open Table" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Eyebrow>{open ? "Open now" : data.starts_at ? `Opens ${whenText(data.starts_at)}` : "Opening soon"}</Eyebrow>
          <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-[-0.02em]">{data.title}</h1>
        </div>
        {data.joined ? (
          <button type="button" disabled={busy} onClick={() => void act(async () => { await api.leaveTable(tableId, founderId); setData(await api.cafeTable(tableId, founderId)); })} className={buttonClass("secondary", "w-auto px-4")}>
            Leave table
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={() => void act(async () => setData(await api.joinTable(tableId, founderId)))} className={buttonClass("primary", "w-auto px-5")}>
            Pull up a chair
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex -space-x-2">
          {data.seated.slice(0, 6).map((p) => (
            <span key={p.id} className="rounded-full ring-2 ring-screen">
              <PersonDot person={p} size={32} />
            </span>
          ))}
        </div>
        <p className="text-[13px] text-ink3">
          {data.seated_count} {data.seated_count === 1 ? "founder" : "founders"} at this table
        </p>
      </div>

      <section className="mt-4 rounded-[14px] border-l-0 bg-espresso p-4 text-cream">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ember-light">Pinned</p>
        <p className="mt-1 text-[15px] leading-relaxed">{data.prompt}</p>
      </section>

      <div role="log" aria-live="polite" aria-label={`Conversation at ${data.title}`} className="mt-5 flex flex-1 flex-col gap-3">
        {data.posts.length === 0 ? <p className="text-[14.5px] text-ink3">{open ? "No posts yet. Start the conversation." : "The conversation starts when the table opens."}</p> : null}
        {data.posts.map((p) =>
          p.mine ? (
            <div key={p.id} className="max-w-[85%] self-end">
              <p className="whitespace-pre-line rounded-[16px] rounded-br-[4px] bg-ink px-4 py-3 text-[15px] leading-relaxed text-cream">{p.body}</p>
              <p className="mt-1 text-right text-[12px] text-ink3">You · {postedText(p.posted_at)}</p>
            </div>
          ) : (
            <div key={p.id} className="flex max-w-[90%] gap-2.5 self-start">
              <PersonDot person={p.author} size={32} />
              <div>
                <p className="text-[12.5px] font-bold">
                  {p.author.name} <span className="font-normal text-ink3">· {postedText(p.posted_at)}</span>
                </p>
                <p className="mt-1 whitespace-pre-line rounded-[16px] rounded-tl-[4px] border border-rule bg-card px-4 py-3 text-[15px] leading-relaxed">{p.body}</p>
              </div>
            </div>
          ),
        )}
        {!open && actionError ? <p className="text-[13px] text-ember-deep">{actionError}</p> : null}
        <div ref={endRef} />
      </div>
    </AppShell>
  );
}
