import type { Metadata } from "next";
import { Suspense } from "react";

import { CalmState } from "@/components/ui";
import { InvestorDataPage } from "@/features/admin/data/DataAdmin";

export const metadata: Metadata = { title: "Users & data · Admin", robots: { index: false, follow: false } };

/* The id is runtime data (no generateStaticParams), so it is read inside Suspense. */
export default function Page({ params }: PageProps<"/admin/data/investors/[id]">) {
  return <Suspense fallback={<CalmState title="One moment…" />}>{params.then(({ id }) => <InvestorDataPage id={id} />)}</Suspense>;
}
