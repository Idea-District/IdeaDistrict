import Link from "next/link";

export function AppBar({ backHref, backLabel, title }: { backHref: string; backLabel: string; title: string }) {
  return (
    <header className="mb-6 flex items-center justify-between">
      <Link
        href={backHref}
        className="rounded text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink3 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
      >
        ← {backLabel}
      </Link>
      <p className="text-[15px] font-extrabold tracking-[-0.02em]">{title}</p>
      <span className="w-[70px]" aria-hidden />
    </header>
  );
}
