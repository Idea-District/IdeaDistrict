"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { WhatsOnList } from "@/features/cafe/WhatsOnList";

export default function Page() {
  return <RequireFounder>{(founderId) => <WhatsOnList founderId={founderId} />}</RequireFounder>;
}
