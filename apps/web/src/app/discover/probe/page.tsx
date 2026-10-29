"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { ProbeScreen } from "@/features/discovery/ProbeScreen";

export default function Page() {
  return <RequireFounder>{(founderId) => <ProbeScreen founderId={founderId} />}</RequireFounder>;
}
