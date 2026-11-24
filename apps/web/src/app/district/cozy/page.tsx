"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { DistrictOverview } from "@/features/district/DistrictOverview";

/** A trial look for My District: a cozy board of hexagon tiles instead of the realistic island. */
export default function Page() {
  return <RequireFounder>{(founderId) => <DistrictOverview founderId={founderId} variant="cozy" />}</RequireFounder>;
}
