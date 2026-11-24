"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { Industries } from "@/features/cafe/Industries";

export default function Page() {
  return <RequireFounder>{(founderId) => <Industries founderId={founderId} />}</RequireFounder>;
}
