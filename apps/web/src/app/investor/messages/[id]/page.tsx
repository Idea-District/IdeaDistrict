import { Suspense } from "react";

import { CalmState, PhoneFrame } from "@/components/ui";
import { ThreadScreen } from "@/features/investor/screens";

/* The id is runtime data (no generateStaticParams), so it is read inside Suspense. */
export default function Page({ params }: PageProps<"/investor/messages/[id]">) {
  return (
    <Suspense
      fallback={
        <PhoneFrame>
          <CalmState title="One moment…" />
        </PhoneFrame>
      }
    >
      {params.then(({ id }) => (
        <ThreadScreen id={id} />
      ))}
    </Suspense>
  );
}
