"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { BuildingId } from "@/features/discovery/BuildingId";

export default function Page() {
  return <RequireFounder>{(founderId) => <BuildingId founderId={founderId} />}</RequireFounder>;
}
