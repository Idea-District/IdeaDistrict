import type { Metadata } from "next";

import { DataOverviewPage } from "@/features/admin/data/DataAdmin";

export const metadata: Metadata = { title: "Users & data · Admin", robots: { index: false, follow: false } };

/** The team's view of everyone: how many, who they are, what they've done. Behind the admin token. */
export default function Page() {
  return <DataOverviewPage />;
}
