"use client";

import { RequireFounder } from "@/components/RequireFounder";

import { Thread } from "./Thread";

export function ThreadScreen({ conversationId }: { conversationId: string }) {
  return (
    <RequireFounder>
      {(founderId) => <Thread key={conversationId} founderId={founderId} conversationId={conversationId} />}
    </RequireFounder>
  );
}
