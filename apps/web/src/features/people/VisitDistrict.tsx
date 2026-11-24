"use client";

import Link from "next/link";

import type { Relation, Room, SharedItem } from "@idea-district/api-client";

import { AppShell, ButtonLink, CalmState, ErrorNotice, ReadStrength } from "@/components/ui";
import { api } from "@/lib/api";
import { personLine } from "@/lib/format";
import { BackLink, focus, useLoad } from "@/features/cafe/shared";
import { ROOM_NAMES } from "@/features/district/rooms";

import { firstName, smallLinkClass } from "./shared";

/** E4 · Visiting another founder's District: only the rooms they opened to you. */
export function VisitDistrict({ founderId, personId }: { founderId: string; personId: string }) {
  const q = useLoad(() => api.visitDistrict(personId, founderId), `${founderId}:${personId}`);

  if (!q.data) {
    return (
      <AppShell wide>
        <BackLink href="/people/explore" label="Explore" />
        {q.error ? <ErrorNotice message={q.error} onRetry={q.retry} /> : <CalmState title="Opening their District…" />}
      </AppShell>
    );
  }

  const d = q.data;
  const first = firstName(d.person.name);

  return (
    <AppShell wide>
      <BackLink href="/people/explore" label="Explore" />

      <header className="rounded-[20px] bg-espresso p-5 text-cream lg:p-7">
        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ember-light">Visiting · only what they shared</p>
        <h1 className="mt-2 text-[28px] font-bold leading-[1.1] tracking-[-0.02em]">{d.person.name}</h1>
        <p className="mt-1.5 text-[15px] leading-snug text-cream/85">{personLine(d.person)}</p>
      </header>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <RelationAction relation={d.relation} personId={d.id} />
        <Link
          href={`/ask?about=${encodeURIComponent(d.person.name)}`}
          className={`inline-flex min-h-[44px] items-center rounded-full border border-rule bg-card px-4 text-[14px] font-bold text-ink hover:border-ink ${focus}`}
        >
          Ask ID about {first}
        </Link>
      </div>

      <section aria-labelledby="can-see" className="mt-7">
        <h2 id="can-see" className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink3">
          What you can see
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[16px] border border-rule bg-card p-4">
            <h3 className="text-[14px] font-bold text-ink">Shared rooms</h3>
            {d.shared.length === 0 ? (
              <p className="mt-1.5 text-[14px] text-ink2">None yet. You can see their public card only.</p>
            ) : (
              <ul className="mt-1.5 flex flex-col gap-1 text-[14.5px] text-ink">
                {d.shared.map((r) => (
                  <li key={r}>{ROOM_NAMES[r]}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-[16px] border border-rule bg-card p-4">
            <h3 className="text-[14px] font-bold text-ink">Kept private</h3>
            {d.private.length === 0 ? (
              <p className="mt-1.5 text-[14px] text-ink2">Nothing. Every room is open to you.</p>
            ) : (
              <ul className="mt-1.5 flex flex-col gap-1 text-[14.5px] text-ink3">
                {d.private.map((r) => (
                  <li key={r}>{ROOM_NAMES[r]}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {d.shared.length > 0 ? (
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {d.shared.map((room) => (
            <RoomSection key={room} room={room} items={d.rooms[room] ?? []} />
          ))}
        </div>
      ) : null}
    </AppShell>
  );
}

function RoomSection({ room, items }: { room: Room; items: SharedItem[] }) {
  const id = `room-${room}`;
  return (
    <section aria-labelledby={id} className="rounded-[16px] border border-rule bg-card p-4">
      <h2 id={id} className="text-[17px] font-bold text-ink">
        {ROOM_NAMES[room]}
      </h2>
      {room === "capabilities" ? (
        <p className="mt-1 text-[13px] text-ink3">
          <span className="inferred">Italic is what we worked out</span>, not what they told us.
        </p>
      ) : null}
      {items.length === 0 ? (
        <p className="mt-2 text-[14px] text-ink3">Open, but nothing in it yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-rule">
          {items.map((it, i) => (
            <li key={i} className="py-2.5 first:pt-1 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink3">{it.label}</p>
                {room === "capabilities" && it.confidence ? <ReadStrength value={it.confidence} /> : null}
              </div>
              <p className={`mt-0.5 leading-snug ${room === "capabilities" ? "inferred text-[15.5px]" : "text-[15px] text-ink"}`}>{it.value}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RelationAction({ relation, personId }: { relation: Relation; personId: string }) {
  if (relation === "none") {
    return (
      <ButtonLink href={`/people/${personId}/meet`} className="w-auto">
        Where could your journeys meet?
      </ButtonLink>
    );
  }
  if (relation === "request_sent") {
    return <p className="min-h-[44px] content-center text-[14.5px] font-semibold text-ink2">Request sent · waiting for them</p>;
  }
  if (relation === "request_received") {
    return (
      <p className="flex min-h-[44px] flex-wrap items-center gap-x-1 text-[14.5px] font-semibold text-ink">
        They asked to connect.
        <Link href="/people/connections" className={smallLinkClass}>
          Answer in Connections
        </Link>
      </p>
    );
  }
  return (
    <p className="flex min-h-[44px] flex-wrap items-center gap-x-1 text-[14.5px] font-semibold text-ink">
      You&rsquo;re connected.
      <Link href="/messages" className={smallLinkClass}>
        Go to Messages
      </Link>
    </p>
  );
}
