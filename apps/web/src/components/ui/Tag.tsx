import type { ReactNode } from "react";

type Kind = "declared" | "unknown" | "observed" | "new" | "plain";

const kinds: Record<Kind, string> = {
  declared: "bg-rule text-ink",
  unknown: "bg-ember text-white",
  observed: "bg-espresso text-cream",
  new: "bg-ember text-white",
  plain: "bg-ember-tint text-ember-deep",
};

export function Tag({ kind, children }: { kind: Kind; children?: ReactNode }) {
  const text = children ?? kind.toUpperCase();
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-[7px] py-[2px] text-[9.5px] font-bold uppercase leading-none tracking-[0.08em] ${kinds[kind]}`}
    >
      {text}
    </span>
  );
}
