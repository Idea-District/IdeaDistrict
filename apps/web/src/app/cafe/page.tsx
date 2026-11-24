"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { CafeHome } from "@/features/cafe/CafeHome";

export default function Page() {
  return <RequireFounder>{(founderId) => <CafeHome founderId={founderId} />}</RequireFounder>;
}
