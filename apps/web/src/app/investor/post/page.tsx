"use client";

import { PostOpportunity } from "@/features/investor/PostOpportunity";
import { RequireInvestor } from "@/features/investor/RequireInvestor";

export default function Page() {
  return <RequireInvestor>{(investorId) => <PostOpportunity investorId={investorId} />}</RequireInvestor>;
}
