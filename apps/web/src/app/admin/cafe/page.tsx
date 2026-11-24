import type { Metadata } from "next";

import { CafeAdmin } from "@/features/admin/CafeAdmin";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/** The team's admin console for Cafe content. Not a founder screen: no app shell, no founder gate. */
export default function Page() {
  return <CafeAdmin />;
}
