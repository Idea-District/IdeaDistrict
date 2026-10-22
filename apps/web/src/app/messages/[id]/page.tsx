import { Suspense } from "react";

import { CalmState, PhoneFrame } from "@/components/ui";
import { ThreadScreen } from "@/features/messages/ThreadScreen";

/* The conversation id is runtime data (no generateStaticParams), so it is read inside Suspense. */
export default function Page({ params }: PageProps<"/messages/[id]">) {
  return (
    <Suspense
      fallback={
        <PhoneFrame>
          <CalmState title="Opening the conversation…" />
        </PhoneFrame>
      }
    >
      {params.then(({ id }) => (
        <ThreadScreen conversationId={id} />
      ))}
    </Suspense>
  );
}
