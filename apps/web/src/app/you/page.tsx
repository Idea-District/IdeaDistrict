"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { YouScreen } from "@/features/id/YouScreen";

export default function Page() {
  return <RequireFounder>{() => <YouScreen />}</RequireFounder>;
}
