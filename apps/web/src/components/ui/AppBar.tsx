import Link from "next/link";
import type { ReactNode } from "react";

export function AppBar({ backHref, backLabel, title }: { backHref: string; backLabel: string; title?: ReactNode }) {
  return (
    <header className="mb-6 flex items-center justify-between gap-3">
      <Link
        href={backHref}
        className="rounded text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink3 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
      >
        ← {backLabel}
      </Link>
      {title ? <p className="text-[15px] font-extrabold tracking-[-0.02em]">{title}</p> : null}
      {title ? <span className="w-[70px]" aria-hidden /> : null}
    </header>
  );
}
