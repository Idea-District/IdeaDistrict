"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { VisibilityRoom } from "@/features/district/VisibilityRoom";

export default function Page() {
  return <RequireFounder>{(founderId) => <VisibilityRoom founderId={founderId} />}</RequireFounder>;
}
