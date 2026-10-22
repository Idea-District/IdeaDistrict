"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { CalmState, PhoneFrame } from "@/components/ui";
import { useStored } from "@/lib/session";

import { DiscoverFlow } from "./DiscoverFlow";

/** Needs a discovery session; without one, go back and start it. */
export function DiscoverScreen({ founderId }: { founderId: string }) {
  const sessionId = useStored("sessionId");
  const router = useRouter();

  useEffect(() => {
    if (sessionId === null) router.replace("/start/known");
  }, [sessionId, router]);

  if (!sessionId) {
    return (
      <PhoneFrame>
        <CalmState title="One moment…" />
      </PhoneFrame>
    );
  }
  return <DiscoverFlow key={sessionId} founderId={founderId} sessionId={sessionId} />;
}
