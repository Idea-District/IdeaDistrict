"use client";

import { InsightsScreen } from "@/features/investor/InsightsScreen";
import { RequireInvestor } from "@/features/investor/RequireInvestor";

export default function Page() {
  return <RequireInvestor>{(investorId) => <InsightsScreen investorId={investorId} />}</RequireInvestor>;
}
