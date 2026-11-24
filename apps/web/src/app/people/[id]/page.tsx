import { Suspense } from "react";

import { CalmState, PhoneFrame } from "@/components/ui";
import { VisitScreen } from "@/features/people/screens";

/* The member id is runtime data (no generateStaticParams), so it is read inside Suspense. */
export default function Page({ params }: PageProps<"/people/[id]">) {
  return (
    <Suspense
      fallback={
        <PhoneFrame>
          <CalmState title="Opening their District…" />
        </PhoneFrame>
      }
    >
      {params.then(({ id }) => (
        <VisitScreen personId={id} />
      ))}
    </Suspense>
  );
}
