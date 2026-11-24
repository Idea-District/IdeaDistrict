"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { DailyBrew } from "@/features/cafe/DailyBrew";

export default function Page() {
  return <RequireFounder>{(founderId) => <DailyBrew founderId={founderId} />}</RequireFounder>;
}
