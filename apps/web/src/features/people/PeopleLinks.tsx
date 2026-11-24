"use client";

import Link from "next/link";

import { api } from "@/lib/api";
import { focus, useLoad } from "@/features/cafe/shared";

const pill = `inline-flex min-h-[44px] items-center gap-2 rounded-full border border-rule bg-card px-4 text-[14px] font-bold text-ink hover:border-ink ${focus}`;

/** The row of People destinations under the heading, with a count of requests waiting for you. */
export function PeopleLinks({ founderId, className = "" }: { founderId: string; className?: string }) {
  const q = useLoad(() => api.connections(founderId), founderId);
  const waiting = q.data?.received.length ?? 0;

  return (
    <nav aria-label="People" className={className}>
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link href="/people/explore" className={pill}>
            Explore Districts
          </Link>
        </li>
        <li>
          <Link href="/people/connections" className={pill}>
            Connections
            {waiting > 0 ? (
              <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-ember px-1.5 text-[12px] font-bold text-ink">
                {waiting}
                <span className="sr-only"> {waiting === 1 ? "request" : "requests"} waiting</span>
              </span>
            ) : null}
          </Link>
        </li>
        <li>
          <Link href="/people/opportunities" className={pill}>
            Opportunities
          </Link>
        </li>
      </ul>
    </nav>
  );
}
