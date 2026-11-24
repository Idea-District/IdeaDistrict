"use client";

import { RequireFounder } from "@/components/RequireFounder";
import { ConversationList } from "@/features/messages/ConversationList";

/** A trial look for Messages: a storybook pier with paper lanterns, instead of the realistic one. */
export default function Page() {
  return <RequireFounder>{(founderId) => <ConversationList founderId={founderId} variant="cozy" />}</RequireFounder>;
}
