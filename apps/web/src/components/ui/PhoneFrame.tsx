import type { ReactNode } from "react";

/** The phone-width column every screen sits in. Full width on mobile, centred on desktop. */
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
    <div className="flex min-h-dvh w-full justify-center bg-cream">
      <div className="flex min-h-dvh w-full max-w-[420px] flex-col sm:border-x sm:border-rule2">
        <main className={`flex flex-1 flex-col px-4 pt-7 pb-8 ${className}`}>{children}</main>
        {footer}
      </div>
    </div>
  );
}
