"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { ProgressRoom } from "@/features/district/ProgressRoom";

export default function Page() {
  return <RequireFounder>{(founderId) => <ProgressRoom founderId={founderId} />}</RequireFounder>;
}
