"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useStored } from "@/lib/session";
import { useUnreadCount } from "@/lib/useUnreadCount";

import { IdMark } from "./IdMark";

/* The four places in the founder app (prototype v1): Cafe, District, People, Messages.
   The Quick Breaks room (the toolkit) is entered from the Cafe; Ask ID floats on every screen. */
export const tabs = [
  { href: "/cafe", label: "Cafe", match: ["/cafe", "/quick-breaks"] },
  { href: "/district", label: "District", match: ["/district", "/id"] },
  { href: "/people", label: "People", match: ["/people", "/for-you"] },
  { href: "/messages", label: "Messages", match: ["/messages"] },
] as const;

type TabLabel = (typeof tabs)[number]["label"];

export function NavIcon({ name, size = 22 }: { name: TabLabel | "Ask ID" | "Me"; size?: number }) {
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
    case "Cafe":
      return (
        <svg {...common}>
          <path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
          <path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17" />
          <path d="M8 3v2M12 3v2" />
        </svg>
      );
    case "District":
      return (
        <svg {...common}>
          <path d="M3 11l9-7 9 7" />
          <path d="M5 10v10h14V10" />
        </svg>
      );
    case "People":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
          <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" />
        </svg>
      );
    case "Messages":
      return (
        <svg {...common}>
          <path d="M4 5h16v11H9l-5 4z" />
        </svg>
      );
    case "Ask ID":
      return (
        <svg {...common}>
          <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
        </svg>
      );
  }
}

function useActive() {
  const pathname = usePathname();
  return (match: readonly string[]) => match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ember px-1 text-[9.5px] font-bold leading-none text-ink">
      {count > 9 ? "9+" : count}
    </span>
  );
}

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember";

/** Bottom tab bar on phones (hidden on wide screens, where the sidebar takes over). */
export function TabBar() {
  const isActive = useActive();
  const unread = useUnreadCount(useStored("founderId"));
  return (
    <nav aria-label="Main" className="sticky bottom-0 z-20 border-t border-rule bg-card/95 backdrop-blur lg:hidden">
      <ul className="flex pb-[env(safe-area-inset-bottom)]">
        {tabs.map((t) => {
          const active = isActive(t.match);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-bold focus-visible:-outline-offset-2 ${focus} ${active ? "text-ember-deep" : "text-ink3 hover:text-ink"}`}
              >
                <span className="relative">
                  <NavIcon name={t.label} />
                  {t.label === "Messages" ? <UnreadBadge count={unread} /> : null}
                </span>
                {t.label}
                {t.label === "Messages" && unread > 0 ? <span className="sr-only">, {unread} unread</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Left sidebar on wide screens: the same four places, Ask ID and the founder's own page. */
export function SideNav() {
  const isActive = useActive();
  const founderId = useStored("founderId");
  const name = useStored("founderName");
  const unread = useUnreadCount(founderId);
  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-rule bg-cream px-4 py-6 lg:flex">
      <Link href="/cafe" className={`mb-8 flex items-center gap-3 rounded px-2 ${focus}`}>
        <IdMark size={30} />
        <span className="text-[11px] font-bold tracking-[0.22em]">IDEA DISTRICT</span>
      </Link>
      <nav aria-label="Main">
        <ul className="flex flex-col gap-1">
          {tabs.map((t) => {
            const active = isActive(t.match);
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex min-h-[44px] items-center gap-3 rounded-[10px] px-3 text-[15px] font-semibold ${focus} ${
                    active ? "bg-ink text-cream" : "text-ink2 hover:bg-sand hover:text-ink"
                  }`}
                >
                  {active ? <span aria-hidden className="pixel absolute -left-4 top-1/2 h-3 w-3 -translate-y-1/2" /> : null}
                  <span className="relative">
                    <NavIcon name={t.label} size={20} />
                    {t.label === "Messages" ? <UnreadBadge count={unread} /> : null}
                  </span>
                  {t.label}
                  {t.label === "Messages" && unread > 0 ? <span className="sr-only">, {unread} unread</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <Link
        href="/ask"
        aria-current={isActive(["/ask"]) ? "page" : undefined}
        className={`mt-6 flex min-h-[44px] items-center gap-2 rounded-[10px] border-2 border-ink px-3 text-[15px] font-bold hover:bg-ember ${isActive(["/ask"]) ? "bg-ember" : ""} ${focus}`}
      >
        <NavIcon name="Ask ID" size={18} />
        Ask ID
      </Link>
      <div className="mt-auto">
        <Link
          href="/you"
          aria-current={isActive(["/you"]) ? "page" : undefined}
          className={`flex min-h-[48px] items-center gap-3 rounded-[10px] px-2 hover:bg-sand ${focus}`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ember text-[15px] font-bold text-ink">
            {(name ?? "?").slice(0, 1).toUpperCase()}
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[14px] font-bold">{name ?? "You"}</span>
            <span className="text-[12px] text-ink3">Profile and privacy</span>
          </span>
        </Link>
      </div>
    </aside>
  );
}

/** Ask ID, floating above the tab bar on phones. On wide screens it lives in the sidebar. */
export function AskIdButton() {
  const pathname = usePathname();
  if (pathname.startsWith("/ask")) return null;
  return (
    <Link
      href="/ask"
      className={`fixed right-4 bottom-[76px] z-30 flex h-[52px] items-center gap-2 rounded-full bg-ink px-5 text-[15px] font-bold text-cream shadow-[0_8px_20px_rgba(25,25,25,0.25)] hover:bg-ember hover:text-ink lg:hidden ${focus}`}
    >
      <NavIcon name="Ask ID" size={18} />
      Ask ID
    </Link>
  );
}
