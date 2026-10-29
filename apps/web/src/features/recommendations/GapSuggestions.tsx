"use client";

import { Label } from "@/components/ui";
import { GapCards } from "@/features/id/GapCard";
import { useFounderIdData } from "@/features/id/useFounderIdData";

/** "Or help us understand you better": up to three open gaps, once the ID is built. */
export function GapSuggestions({ founderId }: { founderId: string }) {
  const { data } = useFounderIdData(founderId);
  if (!data?.built_at) return null;
  const open = data.gaps.filter((g) => g.status !== "closed");
  if (open.length === 0) return null;
  return (
    <section className="mt-8">
      <Label tone="neutral" as="h2">
        Or help us understand you better
      </Label>
      <div className="mt-3">
        <GapCards gaps={open} founderId={founderId} limit={3} />
      </div>
    </section>
  );
}
