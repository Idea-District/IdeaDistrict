"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { YouScreen } from "@/features/id/YouScreen";

export default function Page() {
  return <RequireFounder>{(founderId) => <YouScreen founderId={founderId} />}</RequireFounder>;
}
