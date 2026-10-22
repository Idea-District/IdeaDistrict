"use client";

import { useEffect, useState } from "react";

import type { PendingOutcome } from "@idea-district/api-client";

import { api } from "@/lib/api";

import { OutcomeSurvey } from "./OutcomeSurvey";

/**
 * Shows the outcome survey for the first introduction that is due for feedback, then the next.
 * Optional `withName` limits it to one person (used at the top of a conversation).
 * Quietly renders nothing if the endpoint fails: the survey must never block the screen.
 */
export function PendingOutcomes({
  founderId,
  withName,
  className = "",
}: {
  founderId: string;
  withName?: string;
  className?: string;
}) {
  const [queue, setQueue] = useState<PendingOutcome[] | null>(null);

  useEffect(() => {
    if (queue) return;
    let live = true;
    api.pendingOutcomes(founderId).then(
      (list) => live && setQueue(list),
      () => live && setQueue([]),
    );
    return () => {
      live = false;
    };
  }, [founderId, queue]);

  const visible = (queue ?? []).filter((o) => !withName || o.with.name === withName);
  const first = visible[0];
  if (!first) return null;

  return (
    <div className={className}>
      <OutcomeSurvey
        key={first.recommendation_id}
        founderId={founderId}
        outcome={first}
        onDone={() => setQueue((q) => (q ?? []).filter((o) => o.recommendation_id !== first.recommendation_id))}
      />
    </div>
  );
}
