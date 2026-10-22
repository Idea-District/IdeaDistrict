import type { ReactNode } from "react";

/** The phone-width column every screen sits in. Full width on mobile; on wider screens a
 *  rounded card on the sand surround, as in prototype v0.2. `overflow-clip` (not hidden)
 *  keeps the rounded corners without breaking the sticky tab bar. */
export function PhoneFrame({
  children,
  footer,
  className = "",
}: {
  children: ReactNode;
  /** Pinned to the bottom of the column (e.g. the tab bar). */
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-dvh w-full justify-center bg-surround sm:py-6">
      <div className="flex min-h-dvh w-full max-w-[420px] flex-col bg-screen sm:min-h-[calc(100dvh-3rem)] sm:overflow-clip sm:rounded-[28px] sm:shadow-[0_20px_60px_rgba(33,21,11,0.12)]">
        <main className={`flex flex-1 flex-col px-4 pt-7 pb-8 ${className}`}>{children}</main>
        {footer}
      </div>
    </div>
  );
}
