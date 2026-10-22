"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { IdMap } from "@/features/id/IdMap";

export default function Page() {
  return <RequireFounder>{(founderId) => <IdMap founderId={founderId} />}</RequireFounder>;
}
