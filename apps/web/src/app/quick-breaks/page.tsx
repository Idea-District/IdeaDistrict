"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { QuickBreaksRoom } from "@/features/cafe/QuickBreaksRoom";

export default function Page() {
  return <RequireFounder>{() => <QuickBreaksRoom />}</RequireFounder>;
}
