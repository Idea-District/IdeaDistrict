"use client";

import Link from "next/link";

import type { CafeTable } from "@idea-district/api-client";

import { AppShell, CalmState, ErrorNotice } from "@/components/ui";
import { api } from "@/lib/api";

import { BackLink, Eyebrow, focus, useLoad, whenText } from "./shared";

function StatusPill({ t }: { t: CafeTable }) {
  if (t.status === "open")
    return <span className="rounded-full bg-ember px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink">Open now</span>;
  return (
    <span className="rounded-full bg-sand px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink2">
      {t.starts_at ? whenText(t.starts_at) : "Soon"}
    </span>
  );
}

/** B4 · Open Table: topic conversations. */
export function OpenTables({ founderId }: { founderId: string }) {
  const { data, error, retry } = useLoad(() => api.cafeTables(founderId), `${founderId}`);

  return (
    <AppShell>
      <BackLink href="/cafe" label="Cafe" />
      <Eyebrow>Open Table</Eyebrow>
      <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.02em]">Pull up a chair</h1>
      <p className="mt-2 max-w-[56ch] text-[15px] text-ink2">Topic conversations founders join because the topic matters to them. Anything you post here is seen by the people at the table.</p>

      {error ? (
        <div className="mt-5">
          <ErrorNotice message={error} onRetry={retry} />
        </div>
      ) : null}
      {!data && !error ? <CalmState title="Setting the tables…" /> : null}
      {data && data.length === 0 ? <p className="mt-6 text-[15px] text-ink3">No tables are open right now. New ones go up on What&rsquo;s On.</p> : null}

      <ul className="mt-6 flex flex-col gap-3">
        {data?.map((t) => (
          <li key={t.id}>
            <Link href={`/cafe/tables/${t.id}`} className={`flex flex-col gap-2 rounded-[16px] border border-rule bg-card p-5 hover:border-ink ${focus}`}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-[18px] font-bold leading-snug">{t.title}</h2>
                <StatusPill t={t} />
              </div>
              <p className="text-[14.5px] leading-relaxed text-ink2">{t.prompt}</p>
              <p className="text-[13px] text-ink3">
                {t.seated_count} {t.seated_count === 1 ? "founder" : "founders"} seated · {t.post_count} {t.post_count === 1 ? "post" : "posts"}
                {t.joined ? " · you're at this table" : ""}
              </p>
              <span className="mt-1 text-[14px] font-bold">
                {t.joined ? "Back to the table" : t.status === "open" ? "Pull up a chair" : "Take a look"} <span aria-hidden>→</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
