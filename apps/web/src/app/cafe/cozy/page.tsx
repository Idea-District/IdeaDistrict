"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { CafeHome } from "@/features/cafe/CafeHome";

/** A trial look for the Cafe: a cozy little cafe on a board of tiles, instead of the realistic room. */
export default function Page() {
  return <RequireFounder>{(founderId) => <CafeHome founderId={founderId} variant="cozy" />}</RequireFounder>;
}
