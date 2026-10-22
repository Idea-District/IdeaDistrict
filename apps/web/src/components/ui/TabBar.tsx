"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/for-you", label: "For you", match: ["/for-you"] },
  { href: "/messages", label: "Messages", match: ["/messages"] },
  { href: "/you", label: "You", match: ["/you", "/id"] },
] as const;

function Icon({ name }: { name: (typeof tabs)[number]["label"] }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  if (name === "For you")
    return (
      <svg {...common} aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  if (name === "Messages")
    return (
      <svg {...common} aria-hidden>
        <path d="M4 5h16v11H8l-4 4z" />
      </svg>
    );
  return (
    <svg {...common} aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="sticky bottom-0 border-t border-rule bg-cream/95 backdrop-blur">
      <ul className="flex">
        {tabs.map((t) => {
          const active = t.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ember ${active ? "text-ember" : "text-ink3 hover:text-ink"}`}
              >
                <Icon name={t.label} />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
