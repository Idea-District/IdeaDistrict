"use client";

import { Thesis } from "@/features/investor/Thesis";
import { RequireInvestor } from "@/features/investor/RequireInvestor";

export default function Page() {
  return <RequireInvestor>{(investorId) => <Thesis investorId={investorId} />}</RequireInvestor>;
}
