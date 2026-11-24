"use client";

import { Suspense } from "react";

import { RequireFounder } from "@/components/RequireFounder";
import { CalmState, PhoneFrame } from "@/components/ui";
import { AskIdChat } from "@/features/askid/AskIdChat";

/* AskIdChat reads ?about= (e.g. from an industry read), so it sits inside Suspense. */
export default function Page() {
  return (
    <Suspense
      fallback={
        <PhoneFrame>
          <CalmState title="Opening Ask ID…" />
        </PhoneFrame>
      }
    >
      <RequireFounder>{(founderId) => <AskIdChat founderId={founderId} />}</RequireFounder>
    </Suspense>
  );
}
