import { Suspense } from "react";

import { CalmState, PhoneFrame } from "@/components/ui";
import { OpportunityScreen } from "@/features/opportunities/OpportunityScreen";

/* The id is runtime data (no generateStaticParams), so it is read inside Suspense. */
export default function Page({ params }: PageProps<"/people/opportunities/[id]">) {
  return (
    <Suspense
      fallback={
        <PhoneFrame>
          <CalmState title="Opening the opportunity…" />
        </PhoneFrame>
      }
    >
      {params.then(({ id }) => (
        <OpportunityScreen id={id} />
      ))}
    </Suspense>
  );
}
