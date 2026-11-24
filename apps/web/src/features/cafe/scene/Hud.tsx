"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { IdMark, NavIcon, tabs } from "@/components/ui";
import { useStored } from "@/lib/session";
import { useUnreadCount } from "@/lib/useUnreadCount";

import { focus } from "../shared";
import type { TimeOfDay } from "./palette";

const glass = "bg-ink/70 text-cream backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.25)]";

function IconButton({ label, pressed, onClick, children }: { label: string; pressed?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center rounded-full ${glass} hover:bg-ink ${focus}`}
    >
      {children}
    </button>
  );
}

const svg = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

function TimeIcon({ tod }: { tod: TimeOfDay }) {
  if (tod === "evening")
    return (
      <svg {...svg}>
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
      </svg>
    );
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

/** The menu: everything the sidebar had, slid in from the side so the cafe can fill the screen. */
function MenuDrawer({ onClose, onList, current }: { onClose: () => void; onList: () => void; current: string }) {
  const founderId = useStored("founderId");
  const name = useStored("founderName");
  const unread = useUnreadCount(founderId);
  const first = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    first.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" aria-label="Close the menu" className="cafe-scrim absolute inset-0 bg-ink/40" onClick={onClose} />
      <nav className="cafe-drawer absolute top-0 left-0 flex h-full w-[290px] max-w-[85vw] flex-col bg-cream px-5 py-6 text-ink shadow-2xl">
        <div className="mb-8 flex items-center justify-between">
          <span className="flex items-center gap-3">
            <IdMark size={30} />
            <span className="text-[11px] font-bold tracking-[0.22em]">IDEA DISTRICT</span>
          </span>
          <button type="button" onClick={onClose} aria-label="Close the menu" className={`flex h-10 w-10 items-center justify-center rounded-full hover:bg-sand ${focus}`}>
            <svg {...svg}>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <ul className="flex flex-col gap-1">
          {tabs.map((t, i) => (
            <li key={t.href}>
              <Link
                ref={i === 0 ? first : undefined}
                href={t.href}
                onClick={onClose}
                aria-current={t.href === current ? "page" : undefined}
                className={`relative flex min-h-[48px] items-center gap-3 rounded-[12px] px-3 text-[16px] font-semibold ${focus} ${
                  t.href === current ? "bg-ink text-cream" : "text-ink2 hover:bg-sand hover:text-ink"
                }`}
              >
                <NavIcon name={t.label} size={20} />
                {t.label}
                {t.label === "Messages" && unread > 0 ? (
                  <span className="ml-auto rounded-full bg-ember px-2 py-0.5 text-[11px] font-bold text-ink">{unread > 9 ? "9+" : unread}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/ask" className={`mt-6 flex min-h-[48px] items-center gap-2 rounded-[12px] border-2 border-ink px-3 text-[16px] font-bold hover:bg-ember ${focus}`}>
          <NavIcon name="Ask ID" size={18} /> Ask ID
        </Link>
        <button
          type="button"
          onClick={onList}
          className={`mt-3 flex min-h-[48px] items-center gap-2 rounded-[12px] px-3 text-left text-[15px] font-semibold text-ink2 hover:bg-sand hover:text-ink ${focus}`}
        >
          <svg {...svg}>
            <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
          </svg>
          See it as a list
        </button>
        <Link href="/you" className={`mt-auto flex min-h-[52px] items-center gap-3 rounded-[12px] px-2 hover:bg-sand ${focus}`}>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ember text-[16px] font-bold text-ink">{(name ?? "?").slice(0, 1).toUpperCase()}</span>
          <span className="flex flex-col leading-tight">
            <span className="text-[15px] font-bold">{name ?? "You"}</span>
            <span className="text-[12.5px] text-ink3">Profile and privacy</span>
          </span>
        </Link>
      </nav>
    </div>
  );
}

/** Everything floating over a 3D place: where you are, the time of day, sound, and the way out. */
export function Hud({
  eyebrow,
  title,
  sub,
  current,
  tod,
  hidden,
  soundOn,
  onTime,
  onSound,
  onList,
}: {
  eyebrow: string;
  title: string;
  sub?: ReactNode;
  /** The main-nav entry this place belongs to, highlighted in the menu. */
  current: string;
  tod: TimeOfDay;
  /** Fades the greeting on phones while a panel is open. */
  hidden: boolean;
  soundOn?: boolean;
  onTime: () => void;
  /** Leave out for places without sound. */
  onSound?: () => void;
  onList: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const close = useCallback(() => setMenu(false), []);
  return (
    <>
      <header className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 bg-gradient-to-b from-ink/65 via-ink/20 to-transparent px-4 pt-4 pb-14 transition-opacity duration-300 sm:px-6 ${hidden ? "opacity-0 sm:opacity-100" : ""}`}>
        <div className="pointer-events-auto flex items-start gap-3">
          <IconButton label="Open the menu" onClick={() => setMenu(true)}>
            <svg {...svg}>
              <path d="M4 7h16M4 12h16M4 17h10" />
            </svg>
          </IconButton>
          <div className="text-cream">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-ember-light">{eyebrow}</p>
            <h1 className="mt-0.5 text-[22px] font-bold leading-tight tracking-[-0.02em] sm:text-[28px]">{title}</h1>
            {sub ? <div className="mt-0.5 text-[12.5px] text-cream/85">{sub}</div> : null}
          </div>
        </div>
        <div className="pointer-events-auto flex shrink-0 items-center gap-2">
          <IconButton label={`Time of day: ${tod}. Change it`} onClick={onTime}>
            <TimeIcon tod={tod} />
          </IconButton>
          {onSound ? (
          <IconButton label={soundOn ? "Turn the sound off" : "Turn the sound on"} pressed={soundOn} onClick={onSound}>
            {soundOn ? (
              <svg {...svg}>
                <path d="M4 10v4h4l5 4V6L8 10z" />
                <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
              </svg>
            ) : (
              <svg {...svg}>
                <path d="M4 10v4h4l5 4V6L8 10z" />
                <path d="M17 9l5 6M22 9l-5 6" />
              </svg>
            )}
          </IconButton>
          ) : null}
          <span className="hidden sm:block">
            <IconButton label="Switch to the list view" onClick={onList}>
              <svg {...svg}>
                <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
              </svg>
            </IconButton>
          </span>
          <Link
            href="/ask"
            aria-label="Ask ID"
            className={`flex h-11 w-11 items-center justify-center rounded-full bg-ember text-ink shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:bg-cream sm:hidden ${focus}`}
          >
            <NavIcon name="Ask ID" size={19} />
          </Link>
          <Link href="/ask" className={`hidden h-11 items-center gap-2 rounded-full bg-ember px-4 text-[14px] font-bold text-ink shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:bg-cream sm:flex ${focus}`}>
            <NavIcon name="Ask ID" size={17} /> Ask ID
          </Link>
        </div>
      </header>
      {menu ? <MenuDrawer onClose={close} onList={onList} current={current} /> : null}
    </>
  );
}
