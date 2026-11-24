"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember";

/** The trial "cozy" look for each place, so it can be tried side by side with the realistic one. */
export const cozyTabs = [
  { href: "/cafe/cozy", label: "Cafe" },
  { href: "/district/cozy", label: "District" },
  { href: "/people/cozy", label: "People" },
  { href: "/messages/cozy", label: "Messages" },
] as const;

/** A small menu group: open any place in the cozy look. */
export function CozyMenu({ onPick }: { onPick?: () => void }) {
  const path = usePathname();
  return (
    <div className="mt-6 rounded-[12px] bg-sand/60 p-3">
      <p className="px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ink3">Cozy look · trial</p>
      <ul className="mt-2 grid grid-cols-2 gap-1.5">
        {cozyTabs.map((t) => {
          const here = path === t.href;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                onClick={onPick}
                aria-current={here ? "page" : undefined}
                className={`flex min-h-[40px] items-center justify-center rounded-[10px] px-2 text-[13.5px] font-bold ${focus} ${
                  here ? "bg-ember text-ink" : "bg-cream text-ink hover:bg-ink hover:text-cream"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
