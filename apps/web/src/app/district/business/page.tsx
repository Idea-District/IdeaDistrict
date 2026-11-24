"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { BusinessRoom } from "@/features/district/BusinessRoom";

export default function Page() {
  return <RequireFounder>{(founderId) => <BusinessRoom founderId={founderId} />}</RequireFounder>;
}
