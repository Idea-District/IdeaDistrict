"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { CalmState, PhoneFrame } from "@/components/ui";
import { useStored } from "@/lib/session";

import { ProbeFlow } from "./ProbeFlow";

/** Keyed by the probe session, so each tapped gap starts fresh even if this route was kept alive. */
export function ProbeScreen({ founderId }: { founderId: string }) {
  const stored = useStored("probeSessionId");
  const probeSessionId = stored ? stored.split("|")[0] : stored;
  const router = useRouter();

  useEffect(() => {
    if (probeSessionId === null) router.replace("/id");
  }, [probeSessionId, router]);

  if (!probeSessionId) {
    return (
      <PhoneFrame>
        <CalmState title="One moment…" />
      </PhoneFrame>
    );
  }
  return <ProbeFlow key={stored ?? ""} founderId={founderId} probeSessionId={probeSessionId} />;
}
