"use client";

import Link from "next/link";

import { AppShell, CalmState, ErrorNotice } from "@/components/ui";
import { api } from "@/lib/api";
import { BackLink, Eyebrow, PersonDot, focus, useLoad } from "@/features/cafe/shared";
import { ROOM_NAMES } from "@/features/district/rooms";

import { PersonText, weekdayText } from "./shared";

/** E3 · A few Districts worth a visit this week. Never a feed. */
export function Explore({ founderId }: { founderId: string }) {
  const q = useLoad(() => api.explore(founderId), founderId);

  return (
    <AppShell>
      <BackLink href="/people" label="People" />
      <Eyebrow>Explore</Eyebrow>
      <h1 className="mt-1 text-[26px] font-bold leading-[1.15] tracking-[-0.02em]">Districts worth a visit this week</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink2">
        A short list, picked from what each founder chose to share. Visiting doesn&rsquo;t connect you.
      </p>

      <div className="mt-6">
        {!q.data ? (
          q.error ? (
            <ErrorNotice message={q.error} onRetry={q.retry} />
          ) : (
            <CalmState title="Looking for Districts worth your time…" />
          )
        ) : q.data.picks.length === 0 ? (
          <div className="rounded-[16px] border border-rule bg-card p-5">
            <p className="text-[16px] font-bold text-ink">No one stands out for you this week.</p>
            <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink2">
              That&rsquo;s a fine answer: we&rsquo;d rather show nobody than fill the page.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {q.data.picks.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/people/${p.id}`}
                  className={`block rounded-[16px] border border-rule bg-card p-4 hover:border-ink ${focus}`}
                >
                  <div className="flex items-start gap-3">
                    <PersonDot person={p.person} size={40} />
                    <PersonText person={p.person} as="h2" />
                  </div>
                  <p className="inferred mt-3 text-[15.5px] leading-snug">{p.reason}</p>
                  <p className="mt-3 text-[13px] text-ink3">
                    {p.shared.length > 0
                      ? `Shares: ${p.shared.map((r) => ROOM_NAMES[r]).join(", ")}`
                      : "Shares only their public card"}
                  </p>
                  <span className="mt-2 inline-block text-[14px] font-bold text-ember-deep">
                    Visit their District <span aria-hidden>→</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {q.data ? (
        <p className="mt-6 text-center text-[13px] text-ink3">New picks every Monday · next on {weekdayText(q.data.next_picks_on)}</p>
      ) : null}
    </AppShell>
  );
}
