import { Suspense } from "react";

import { CalmState, PhoneFrame } from "@/components/ui";
import { IndustryReadScreen } from "@/features/cafe/IndustryReadScreen";

/* The slug is runtime data (no generateStaticParams), so it is read inside Suspense. */
export default function Page({ params }: PageProps<"/quick-breaks/industries/[slug]">) {
  return (
    <Suspense
      fallback={
        <PhoneFrame>
          <CalmState title="Opening the read…" />
        </PhoneFrame>
      }
    >
      {params.then(({ slug }) => (
        <IndustryReadScreen slug={slug} />
      ))}
    </Suspense>
  );
}
