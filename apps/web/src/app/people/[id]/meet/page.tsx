import { Suspense } from "react";

import { CalmState, PhoneFrame } from "@/components/ui";
import { MeetScreen } from "@/features/people/screens";

/* The member id is runtime data (no generateStaticParams), so it is read inside Suspense. */
export default function Page({ params }: PageProps<"/people/[id]/meet">) {
  return (
    <Suspense
      fallback={
        <PhoneFrame>
          <CalmState title="One moment…" />
        </PhoneFrame>
      }
    >
      {params.then(({ id }) => (
        <MeetScreen personId={id} />
      ))}
    </Suspense>
  );
}
