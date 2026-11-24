"use client";

import { RequireFounder } from "@/components/RequireFounder";

import { OpportunityDetail } from "./OpportunityDetail";

export function OpportunityScreen({ id }: { id: string }) {
  return <RequireFounder>{(founderId) => <OpportunityDetail founderId={founderId} oppId={id} />}</RequireFounder>;
}
