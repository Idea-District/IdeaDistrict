"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { AccountScreen } from "@/features/me/AccountScreen";

export default function Page() {
  return <RequireFounder>{(founderId) => <AccountScreen founderId={founderId} />}</RequireFounder>;
}
