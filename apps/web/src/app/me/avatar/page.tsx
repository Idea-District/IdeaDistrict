"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { AvatarCreator } from "@/features/me/AvatarCreator";

export default function Page() {
  return <RequireFounder>{(founderId) => <AvatarCreator founderId={founderId} />}</RequireFounder>;
}
