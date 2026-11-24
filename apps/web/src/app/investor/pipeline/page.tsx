"use client";

import { PipelineScreen } from "@/features/investor/PipelineScreen";
import { RequireInvestor } from "@/features/investor/RequireInvestor";

export default function Page() {
  return <RequireInvestor>{(investorId) => <PipelineScreen investorId={investorId} />}</RequireInvestor>;
}
