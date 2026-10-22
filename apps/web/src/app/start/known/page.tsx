"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { KnownUnknownScreen } from "@/features/discovery/KnownUnknownScreen";

export default function Page() {
  return <RequireFounder>{(founderId) => <KnownUnknownScreen founderId={founderId} />}</RequireFounder>;
}
