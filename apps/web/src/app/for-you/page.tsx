"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { ForYou } from "@/features/recommendations/ForYou";

export default function Page() {
  return <RequireFounder>{(founderId) => <ForYou founderId={founderId} />}</RequireFounder>;
}
