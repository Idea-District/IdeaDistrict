"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { Opportunities } from "@/features/opportunities/Opportunities";

export default function Page() {
  return <RequireFounder>{(founderId) => <Opportunities founderId={founderId} />}</RequireFounder>;
}
