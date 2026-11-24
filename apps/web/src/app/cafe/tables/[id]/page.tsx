import { Suspense } from "react";

import { CalmState, PhoneFrame } from "@/components/ui";
import { TableScreen } from "@/features/cafe/TableScreen";

/* The table id is runtime data (no generateStaticParams), so it is read inside Suspense. */
export default function Page({ params }: PageProps<"/cafe/tables/[id]">) {
  return (
    <Suspense
      fallback={
        <PhoneFrame>
          <CalmState title="Finding your table…" />
        </PhoneFrame>
      }
    >
      {params.then(({ id }) => (
        <TableScreen tableId={id} />
      ))}
    </Suspense>
  );
}
