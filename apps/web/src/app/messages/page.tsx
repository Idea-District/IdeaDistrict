"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { ConversationList } from "@/features/messages/ConversationList";

export default function Page() {
  return <RequireFounder>{(founderId) => <ConversationList founderId={founderId} />}</RequireFounder>;
}
