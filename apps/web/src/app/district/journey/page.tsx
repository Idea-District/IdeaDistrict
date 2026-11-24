"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { JourneyRoom } from "@/features/district/JourneyRoom";

export default function Page() {
  return <RequireFounder>{(founderId) => <JourneyRoom founderId={founderId} />}</RequireFounder>;
}
