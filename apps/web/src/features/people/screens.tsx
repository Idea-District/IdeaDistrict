"use client";

import { RequireFounder } from "@/components/RequireFounder";

import { ConnectionsScreen } from "./ConnectionsScreen";
import { Explore } from "./Explore";
import { Meet } from "./Meet";
import { VisitDistrict } from "./VisitDistrict";

export function ExploreScreen() {
  return <RequireFounder>{(founderId) => <Explore founderId={founderId} />}</RequireFounder>;
}

export function ConnectionsPage() {
  return <RequireFounder>{(founderId) => <ConnectionsScreen founderId={founderId} />}</RequireFounder>;
}

export function VisitScreen({ personId }: { personId: string }) {
  return <RequireFounder>{(founderId) => <VisitDistrict founderId={founderId} personId={personId} />}</RequireFounder>;
}

export function MeetScreen({ personId }: { personId: string }) {
  return <RequireFounder>{(founderId) => <Meet founderId={founderId} personId={personId} />}</RequireFounder>;
}
