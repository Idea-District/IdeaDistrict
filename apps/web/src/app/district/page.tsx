"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { DistrictOverview } from "@/features/district/DistrictOverview";

export default function Page() {
  return <RequireFounder>{(founderId) => <DistrictOverview founderId={founderId} />}</RequireFounder>;
}
