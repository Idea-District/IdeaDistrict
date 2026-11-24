"use client";

import { FounderView } from "./FounderView";
import { IntroDetail } from "./IntroDetail";
import { InvestorThread } from "./InvestorThread";
import { RequireInvestor } from "./RequireInvestor";

/* Client wrappers for the routes with an id: a server page can't pass the render function itself. */
export function ThreadScreen({ id }: { id: string }) {
  return <RequireInvestor>{(investorId) => <InvestorThread investorId={investorId} conversationId={id} />}</RequireInvestor>;
}

export function IntroScreen({ id }: { id: string }) {
  return <RequireInvestor>{(investorId) => <IntroDetail investorId={investorId} requestId={id} />}</RequireInvestor>;
}

export function FounderScreen({ id }: { id: string }) {
  return <RequireInvestor>{(investorId) => <FounderView investorId={investorId} founderId={id} />}</RequireInvestor>;
}
