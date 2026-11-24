"use client";

import { Messages } from "@/features/investor/Messages";
import { RequireInvestor } from "@/features/investor/RequireInvestor";

export default function Page() {
  return <RequireInvestor>{(investorId) => <Messages investorId={investorId} />}</RequireInvestor>;
}
