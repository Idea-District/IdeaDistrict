"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { Simulator } from "@/features/cafe/Simulator";

export default function Page() {
  return <RequireFounder>{(founderId) => <Simulator founderId={founderId} />}</RequireFounder>;
}
