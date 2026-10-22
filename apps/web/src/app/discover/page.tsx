"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { DiscoverScreen } from "@/features/discovery/DiscoverScreen";

export default function Page() {
  return <RequireFounder>{(founderId) => <DiscoverScreen founderId={founderId} />}</RequireFounder>;
}
