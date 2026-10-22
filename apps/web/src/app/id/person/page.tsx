"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { PersonDetail } from "@/features/id/PersonDetail";

export default function Page() {
  return <RequireFounder>{(founderId) => <PersonDetail founderId={founderId} />}</RequireFounder>;
}
