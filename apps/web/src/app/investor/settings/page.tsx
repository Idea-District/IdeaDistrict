"use client";

import { Settings } from "@/features/investor/Settings";
import { RequireInvestor } from "@/features/investor/RequireInvestor";

export default function Page() {
  return <RequireInvestor>{(investorId) => <Settings investorId={investorId} />}</RequireInvestor>;
}
