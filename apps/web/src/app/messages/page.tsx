"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { Messages } from "@/features/recommendations/Messages";

export default function Page() {
  return <RequireFounder>{() => <Messages />}</RequireFounder>;
}
