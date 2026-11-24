"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { IdMark, NavIcon } from "@/components/ui";
import { useInvestorStored } from "@/lib/investorSession";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember";

type Place = "Dashboard" | "Pipeline" | "Insights" | "Messages";

const places: { href: string; label: Place; match: string[] }[] = [
  { href: "/investor/dashboard", label: "Dashboard", match: ["/investor/dashboard", "/investor/introductions", "/investor/founders"] },
  { href: "/investor/pipeline", label: "Pipeline", match: ["/investor/pipeline"] },
  { href: "/investor/insights", label: "Insights", match: ["/investor/insights"] },
  { href: "/investor/messages", label: "Messages", match: ["/investor/messages"] },
];

/** Simple stroke icons for the investor places; Messages reuses the founder app's icon. */
export function InvestorIcon({ name, size = 22 }: { name: Place | "Post"; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  } as const;
  switch (name) {
    case "Dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      );
    case "Pipeline":
      return (
        <svg {...common}>
          <path d="M4 5h16M7 12h10M10 19h4" />
        </svg>
      );
    case "Insights":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "Post":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    default:
      return <NavIcon name="Messages" size={size} />;
  }
}

function useActive() {
  const pathname = usePathname();
  return (match: readonly string[]) => match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
}

function InvestorTabBar() {
  const isActive = useActive();
  return (
    <nav aria-label="Investor" className="sticky bottom-0 z-20 border-t border-rule bg-card/95 backdrop-blur lg:hidden">
      <ul className="flex pb-[env(safe-area-inset-bottom)]">
        {places.map((t) => {
          const active = isActive(t.match);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-bold focus-visible:-outline-offset-2 ${focus} ${active ? "text-ember-deep" : "text-ink3 hover:text-ink"}`}
              >
                <InvestorIcon name={t.label} />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function InvestorSideNav() {
  const isActive = useActive();
  const name = useInvestorStored("investorName");
  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-rule bg-cream px-4 py-6 lg:flex">
      <Link href="/investor/dashboard" className={`mb-8 flex items-center gap-3 rounded px-2 ${focus}`}>
        <IdMark size={30} />
        <span className="flex flex-col leading-tight">
          <span className="text-[11px] font-bold tracking-[0.22em]">IDEA DISTRICT</span>
          <span className="text-[11px] font-bold tracking-[0.22em] text-espresso">INVESTOR</span>
        </span>
      </Link>
      <nav aria-label="Investor">
        <ul className="flex flex-col gap-1">
          {places.map((t) => {
            const active = isActive(t.match);
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex min-h-[44px] items-center gap-3 rounded-[10px] px-3 text-[15px] font-semibold ${focus} ${
                    active ? "bg-espresso text-cream" : "text-ink2 hover:bg-sand hover:text-ink"
                  }`}
                >
                  <InvestorIcon name={t.label} size={20} />
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <Link
        href="/investor/post"
        aria-current={isActive(["/investor/post"]) ? "page" : undefined}
        className={`mt-6 flex min-h-[44px] items-center gap-2 rounded-[10px] border-2 border-espresso px-3 text-[15px] font-bold text-espresso hover:bg-espresso hover:text-cream ${
          isActive(["/investor/post"]) ? "bg-espresso text-cream" : ""
        } ${focus}`}
      >
        <InvestorIcon name="Post" size={18} />
        Post an opportunity
      </Link>
      <div className="mt-auto">
        <Link
          href="/investor/settings"
          aria-current={isActive(["/investor/settings"]) ? "page" : undefined}
          className={`flex min-h-[48px] items-center gap-3 rounded-[10px] px-2 hover:bg-sand ${focus}`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-espresso text-[15px] font-bold text-cream">
            {(name ?? "?").slice(0, 1).toUpperCase()}
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[14px] font-bold">{name ?? "Investor"}</span>
            <span className="text-[12px] text-ink3">Settings</span>
          </span>
        </Link>
      </div>
    </aside>
  );
}

/** On phones there is no sidebar: a slim top bar keeps the brand, posting and settings in reach. */
function PhoneTopBar() {
  const name = useInvestorStored("investorName");
  return (
    <div className="flex items-center justify-between gap-2 border-b border-rule bg-cream px-3 py-1 lg:hidden">
      <Link href="/investor/dashboard" className={`flex min-h-[44px] items-center gap-2 rounded px-2 ${focus}`}>
        <IdMark size={24} />
        <span className="text-[10.5px] font-bold tracking-[0.2em] text-espresso">INVESTOR</span>
      </Link>
      <div className="flex items-center gap-1">
        <Link href="/investor/post" className={`flex min-h-[44px] items-center gap-1 rounded px-2 text-[13px] font-bold text-espresso ${focus}`}>
          <InvestorIcon name="Post" size={16} />
          Post
        </Link>
        <Link href="/investor/settings" aria-label="Settings" className={`flex h-[44px] w-[44px] items-center justify-center rounded-full ${focus}`}>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-espresso text-[13px] font-bold text-cream">
            {(name ?? "?").slice(0, 1).toUpperCase()}
          </span>
        </Link>
      </div>
    </div>
  );
}

/** The investor app: a left sidebar on wide screens, a bottom tab bar on phones. */
export function InvestorShell({
  children,
  footer,
  className = "",
  wide = true,
}: {
  children: ReactNode;
  /** Replaces the tab bar on phones (e.g. a message composer). */
  footer?: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  const max = wide ? "max-w-[1080px]" : "max-w-[720px]";
  return (
    <div className="flex min-h-dvh w-full bg-screen">
      <InvestorSideNav />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        {footer ? null : <PhoneTopBar />}
        <main className={`mx-auto flex w-full flex-1 flex-col px-5 pt-7 pb-24 lg:px-10 lg:pt-10 lg:pb-12 ${max} ${className}`}>
          {children}
        </main>
        {footer ? (
          <div className="sticky bottom-0 z-20">
            <div className={`mx-auto w-full ${max}`}>{footer}</div>
          </div>
        ) : (
          <InvestorTabBar />
        )}
      </div>
    </div>
  );
}
