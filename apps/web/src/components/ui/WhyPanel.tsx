import type { ReactNode } from "react";

import { Label } from "./Label";

/** Espresso panel: the system explaining itself. Use <strong> for cream emphasis. */
export function WhyPanel({ label, children, className = "" }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-espresso px-[16px] py-[15px] text-[14.5px] leading-relaxed text-[#D5CDBA] [&_strong]:font-bold [&_strong]:text-cream ${className}`}>
      <Label as="h2" className="mb-2">
        {label}
      </Label>
      {children}
    </section>
  );
}
