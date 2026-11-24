"use client";

import Link from "next/link";

import { AppShell, NavIcon } from "@/components/ui";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember";

type Tool = { title: string; body: string; href?: string; note?: string; icon: "ask" | "test" | "explore" };

const TOOLS: Tool[] = [
  { title: "Ask ID", body: "Talk a decision through with a guide that knows your District.", href: "/ask", icon: "ask" },
  { title: "Test an assumption", body: "Pick a path, see the trade-offs. A thinking exercise, not a prediction.", href: "/quick-breaks/simulator", icon: "test" },
  { title: "Explore industries", body: "Short reads on markets and business models, with questions to check.", href: "/quick-breaks/industries", icon: "explore" },
];

function ToolIcon({ name }: { name: Tool["icon"] }) {
  if (name === "ask") return <NavIcon name="Ask ID" size={24} />;
  const common = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
  if (name === "test")
    return (
      <svg {...common}>
        <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" />
        <path d="M7.5 15h9" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </svg>
  );
}

/** D1 · The Quick Breaks room: the founder toolkit, entered from the Cafe. */
export function QuickBreaksRoom() {
  return (
    <AppShell>
      <Link href="/cafe" className={`-ml-1 mb-3 flex min-h-[44px] w-fit items-center gap-1.5 rounded text-[14px] font-semibold text-ink3 hover:text-ink ${focus}`}>
        <span aria-hidden>←</span> Cafe
      </Link>
      <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ember-deep">The Quick Breaks room</p>
      <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.02em] lg:text-[34px]">Step away and test a thought</h1>
      <p className="mt-2 max-w-[56ch] text-[15px] text-ink2">Your toolkit lives here. Everything stays private unless you choose to save it.</p>

      <section className="relative mt-6 overflow-hidden rounded-[16px] bg-espresso p-5 text-cream">
        <span aria-hidden className="pixel absolute top-4 right-6 h-3 w-3" />
        <span aria-hidden className="pixel absolute top-9 right-12 h-2 w-2" />
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ember-light">2-minute warm-up</p>
        <p className="mt-2 max-w-[40ch] text-[18px] font-semibold leading-snug">Which assumption about your customers are you least sure of this week?</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/quick-breaks/simulator" className={`inline-flex min-h-[44px] items-center gap-2 rounded-[10px] bg-cream px-4 text-[14px] font-bold text-ink hover:bg-ember ${focus}`}>
            Test it <span aria-hidden>↗</span>
          </Link>
          <Link href="/ask" className={`inline-flex min-h-[44px] items-center gap-2 rounded-[10px] border-2 border-cream px-4 text-[14px] font-bold text-cream hover:bg-cream hover:text-ink ${focus}`}>
            Talk it through with ID
          </Link>
        </div>
      </section>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => {
          const inner = (
            <>
              <span className={`flex h-12 w-12 items-center justify-center rounded-[12px] ${t.href ? "bg-ember text-ink" : "bg-sand text-ink2"}`}>
                <ToolIcon name={t.icon} />
              </span>
              <span className="mt-3 text-[17px] font-bold">{t.title}</span>
              <span className="mt-1 text-[14px] leading-snug text-ink2">{t.body}</span>
              {t.note ? <span className="mt-3 text-[12.5px] font-semibold text-ink3">{t.note}</span> : null}
            </>
          );
          return (
            <li key={t.title}>
              {t.href ? (
                <Link href={t.href} className={`flex h-full flex-col rounded-[16px] border border-rule bg-card p-5 hover:border-ink ${focus}`}>
                  {inner}
                </Link>
              ) : (
                <div className="flex h-full flex-col rounded-[16px] border border-dashed border-rule p-5">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
