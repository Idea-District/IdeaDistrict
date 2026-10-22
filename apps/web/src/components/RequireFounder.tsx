"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useStored } from "@/lib/session";

import { CalmState, PhoneFrame } from "./ui";

/**
 * Renders children only when a founder id is stored; otherwise sends the user to "/".
 * Children are keyed by founder id so a new founder never sees a previous founder's state
 * (Next keeps recent routes alive with <Activity>).
 */
export function RequireFounder({ children }: { children: (founderId: string) => ReactNode }) {
  const founderId = useStored("founderId");
  const router = useRouter();

  useEffect(() => {
    if (founderId === null) router.replace("/");
  }, [founderId, router]);

  if (!founderId) {
    return (
      <PhoneFrame>
        <CalmState title="One moment…" />
      </PhoneFrame>
    );
  }
  return <div key={founderId} className="contents">{children(founderId)}</div>;
}
