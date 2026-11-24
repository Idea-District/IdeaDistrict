"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { ForYou } from "@/features/recommendations/ForYou";

/** A trial look for People: hexagon-tile islands on a storybook sea, instead of the realistic archipelago. */
export default function Page() {
  return <RequireFounder>{(founderId) => <ForYou founderId={founderId} variant="cozy" />}</RequireFounder>;
}
