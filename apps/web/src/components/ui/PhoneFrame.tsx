import type { ReactNode } from "react";

import { AskIdButton, SideNav, TabBar } from "./TabBar";

/** The single column used before a founder is inside the app (intro, onboarding, discovery).
 *  Full width on phones; on wider screens a card on the beige surround. `overflow-clip` keeps
 *  the rounded corners without breaking a sticky footer. */
export function PhoneFrame({
  children,
  footer,
  className = "",
}: {
  children: ReactNode;
  /** Pinned to the bottom of the column (e.g. a composer). */
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-dvh w-full justify-center bg-surround sm:py-6">
      <div className="flex min-h-dvh w-full max-w-[480px] flex-col bg-screen sm:min-h-[calc(100dvh-3rem)] sm:overflow-clip sm:rounded-[20px] sm:shadow-[0_20px_60px_rgba(25,25,25,0.10)]">
        <main className={`flex flex-1 flex-col px-5 pt-7 pb-8 ${className}`}>{children}</main>
        {footer}
      </div>
    </div>
  );
}

/** The founder app: a left sidebar on wide screens, a bottom tab bar and floating Ask ID on phones.
 *  `wide` lets a screen use more of the desktop width (e.g. the Cafe room or the District map). */
export function AppShell({
  children,
  footer,
  className = "",
  wide = false,
}: {
  children: ReactNode;
  /** Replaces the tab bar on phones (e.g. a message composer). */
  footer?: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-dvh w-full bg-screen">
      <SideNav />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <main
          className={`mx-auto flex w-full flex-1 flex-col px-5 pt-7 pb-24 lg:px-10 lg:pt-10 lg:pb-12 ${wide ? "max-w-[1080px]" : "max-w-[720px]"} ${className}`}
        >
          {children}
        </main>
        {footer ? (
          <div className="sticky bottom-0 z-20">
            <div className={`mx-auto w-full ${wide ? "max-w-[1080px]" : "max-w-[720px]"}`}>{footer}</div>
          </div>
        ) : (
          <TabBar />
        )}
      </div>
      {footer ? null : <AskIdButton />}
    </div>
  );
}
