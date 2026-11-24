"use client";

import { RequireFounder } from "@/components/RequireFounder";

import { TableChat } from "./TableChat";

export function TableScreen({ tableId }: { tableId: string }) {
  return <RequireFounder>{(founderId) => <TableChat founderId={founderId} tableId={tableId} />}</RequireFounder>;
}
