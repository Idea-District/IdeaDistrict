"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { NeedsRoom } from "@/features/district/NeedsRoom";

export default function Page() {
  return <RequireFounder>{(founderId) => <NeedsRoom founderId={founderId} />}</RequireFounder>;
}
