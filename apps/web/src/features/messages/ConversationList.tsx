"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { ConversationSummary } from "@idea-district/api-client";

import { Avatar, CalmState, ErrorNotice, Heading, AppShell } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { shortDate } from "@/lib/format";
import { SceneBoundary } from "@/features/cafe/scene/SceneBoundary";
import { setViewMode, useViewMode } from "@/features/cafe/scene/viewMode";

/** The 3D Lantern Pier loads only in the browser, and only on this page. */
const MessagesScene = dynamic(() => import("./scene/MessagesScene"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-5 bg-espresso text-cream">
      <span aria-hidden className="flex gap-2">
        <span className="pixel h-3.5 w-3.5 animate-pulse" />
        <span className="pixel h-3.5 w-3.5 animate-pulse [animation-delay:150ms]" />
        <span className="pixel h-3.5 w-3.5 animate-pulse [animation-delay:300ms]" />
      </span>
      <p className="text-[15px] font-semibold tracking-wide">Lighting the lanterns…</p>
    </div>
  ),
});

const VIEW_KEY = "messages-view";

/** Messages: conversations exist only after an accepted introduction. */
export function ConversationList({ founderId }: { founderId: string }) {
  const [list, setList] = useState<ConversationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const view = useViewMode(VIEW_KEY);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  // Refetches each time the screen is shown again, so unread counts stay current.
  useEffect(() => {
    let live = true;
    api.conversations(founderId).then(
      (l) => {
        if (!live) return;
        setList(l);
        setError(null);
      },
      (e) => live && setError(errorMessage(e)),
    );
    return () => {
      live = false;
    };
  }, [founderId, attempt]);

  const page = (
    <AppShell>
      {view === "list" ? (
        <button
          type="button"
          onClick={() => setViewMode(VIEW_KEY, "3d")}
          className="mb-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[12px] bg-ember text-[15px] font-bold text-ink hover:bg-ink hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
        >
          Walk out to the lantern pier in 3D <span aria-hidden>↗</span>
        </button>
      ) : null}
      <Heading>Messages</Heading>
      {!list ? (
        error ? (
          <div className="mt-6">
            <ErrorNotice
              message={error}
              onRetry={() => {
                setError(null);
                setAttempt((n) => n + 1);
              }}
            />
          </div>
        ) : (
          <CalmState title="Opening your conversations…" />
        )
      ) : list.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
          <p className="text-[17px] font-extrabold tracking-[-0.02em]">No conversations yet.</p>
          <p className="mt-2 max-w-[300px] text-[14px] leading-relaxed text-ink3">
            Introductions open a conversation — there&rsquo;s no cold messaging here.
          </p>
        </div>
      ) : (
        <ul className="fade-in mt-5 divide-y divide-rule border-y border-rule">
          {list.map((c) => (
            <li key={c.id}>
              <Link
                href={`/messages/${c.id}`}
                className="flex items-center gap-3 py-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
              >
                <Avatar name={c.with.name} size={46} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[15px] font-extrabold tracking-[-0.01em]">{c.with.name}</p>
                    <span className="shrink-0 text-[11.5px] text-ink3">{shortDate(c.last_message_at)}</span>
                  </div>
                  <p className="truncate text-[12px] text-ink3">{c.with.building}</p>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    {c.last_message ? (
                      <p className={`truncate text-[13.5px] ${c.unread > 0 ? "font-bold text-ink" : "text-ink2"}`}>{c.last_message}</p>
                    ) : (
                      <p className="inferred truncate text-[14px]">{c.origin}</p>
                    )}
                    {c.unread > 0 ? (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-ember px-1.5 text-[11px] font-bold text-ink">
                        <span className="sr-only">Unread: </span>
                        {c.unread}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );

  if (view === "list" || error) return page;
  return (
    <SceneBoundary fallback={page}>
      <MessagesScene founderId={founderId} list={list} reload={reload} fallback={page} onListView={() => setViewMode(VIEW_KEY, "list")} />
    </SceneBoundary>
  );
}
