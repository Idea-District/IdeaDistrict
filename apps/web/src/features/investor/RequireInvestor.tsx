"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { CalmState, PhoneFrame } from "@/components/ui";
import { useInvestorStored } from "@/lib/investorSession";

/**
 * Renders children only when an investor id is stored; otherwise sends the user to "/investor".
 * Keyed by investor id so a new investor never sees a previous investor's state.
 */
export function RequireInvestor({ children }: { children: (investorId: string) => ReactNode }) {
  const investorId = useInvestorStored("investorId");
  const router = useRouter();

  useEffect(() => {
    if (investorId === null) router.replace("/investor");
  }, [investorId, router]);

  if (!investorId) {
    return (
      <PhoneFrame>
        <CalmState title="One moment…" />
      </PhoneFrame>
    );
  }
  return (
    <div key={investorId} className="contents">
      {children(investorId)}
    </div>
  );
}
