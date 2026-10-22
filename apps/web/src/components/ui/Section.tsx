import type { ReactNode } from "react";

import { Label } from "./Label";

/** Sand block. Children rendered as rows are separated by 1px rule lines. */
export function Section({
  title,
  titleTone = "neutral",
  children,
  className = "",
}: {
  title?: ReactNode;
  titleTone?: "ember" | "neutral";
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl bg-sand px-[15px] py-[14px] ${className}`}>
      {title ? (
        <Label tone={titleTone} as="h2" className="mb-2">
          {title}
        </Label>
      ) : null}
      {children}
    </section>
  );
}

export function Rows({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-rule">{children}</ul>;
}

export function Row({ children }: { children: ReactNode }) {
  return <li className="py-[10px] first:pt-1 last:pb-0">{children}</li>;
}
