"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { GapsList } from "@/features/id/GapsList";

export default function Page() {
  return <RequireFounder>{(founderId) => <GapsList founderId={founderId} />}</RequireFounder>;
}
