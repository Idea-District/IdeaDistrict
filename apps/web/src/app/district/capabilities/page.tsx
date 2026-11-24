"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { CapabilitiesRoom } from "@/features/district/CapabilitiesRoom";

export default function Page() {
  return <RequireFounder>{(founderId) => <CapabilitiesRoom founderId={founderId} />}</RequireFounder>;
}
