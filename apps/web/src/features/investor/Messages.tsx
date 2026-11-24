"use client";

import Link from "next/link";

import { api } from "@/lib/api";
import { shortDate } from "@/lib/format";

import { InvestorShell } from "./InvestorShell";
import { card, focus, PageTitle, PersonDot, useLoad, Waiting } from "./parts";

/** I9 · Conversations, opened only by an accepted introduction. */
export function Messages({ investorId }: { investorId: string }) {
  const q = useLoad(() => api.conversations(investorId), investorId);
  if (!q.data) return <Waiting error={q.error} retry={q.retry} title="Opening your conversations…" />;
  const list = q.data;

  return (
    <InvestorShell wide={false}>
      <PageTitle title="Messages" />
      {list.length === 0 ? (
        <div className={card}>
          <p className="text-[16px] font-bold text-ink">No conversations yet.</p>
          <p className="mt-1 text-[14px] text-ink2">Accepting an introduction opens a conversation. There&rsquo;s no cold messaging here.</p>
        </div>
      ) : (
        <ul className="divide-y divide-rule border-y border-rule">
          {list.map((c) => (
            <li key={c.id}>
              <Link href={`/investor/messages/${c.id}`} className={`flex items-center gap-3 py-3.5 ${focus}`}>
                <PersonDot person={c.with} size={46} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[15px] font-bold text-ink">{c.with.name}</p>
                    <span className="shrink-0 text-[11.5px] text-ink3">{shortDate(c.last_message_at)}</span>
                  </div>
                  <p className="truncate text-[12px] text-ink3">{c.with.building}</p>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    {c.last_message ? (
                      <p className={`truncate text-[13.5px] ${c.unread > 0 ? "font-bold text-ink" : "text-ink2"}`}>{c.last_message}</p>
                    ) : (
                      <p className="truncate text-[13.5px] text-ink3">{c.origin}</p>
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
    </InvestorShell>
  );
}
