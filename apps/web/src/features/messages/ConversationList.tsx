"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { ConversationSummary } from "@idea-district/api-client";

import { Avatar, CalmState, ErrorNotice, Heading, PhoneFrame, TabBar } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { shortDate } from "@/lib/format";

/** Messages: conversations exist only after an accepted introduction. */
export function ConversationList({ founderId }: { founderId: string }) {
  const [list, setList] = useState<ConversationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

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

  return (
    <PhoneFrame footer={<TabBar />}>
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
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-ember px-1.5 text-[11px] font-bold text-white">
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
    </PhoneFrame>
  );
}
