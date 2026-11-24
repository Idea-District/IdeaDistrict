"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { OpenTables } from "@/features/cafe/OpenTables";

export default function Page() {
  return <RequireFounder>{(founderId) => <OpenTables founderId={founderId} />}</RequireFounder>;
}
