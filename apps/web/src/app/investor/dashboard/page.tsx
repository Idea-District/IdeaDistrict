"use client";

import { Dashboard } from "@/features/investor/Dashboard";
import { RequireInvestor } from "@/features/investor/RequireInvestor";

export default function Page() {
  return <RequireInvestor>{(investorId) => <Dashboard investorId={investorId} />}</RequireInvestor>;
}
