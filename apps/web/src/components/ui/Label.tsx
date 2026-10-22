import type { ReactNode } from "react";

/** Small caps label. Ember when the system is speaking, ink3 when neutral. */
export function Label({
  children,
  tone = "ember",
  className = "",
  as: Tag = "p",
}: {
  children: ReactNode;
  tone?: "ember" | "neutral" | "light";
  className?: string;
  as?: "p" | "span" | "h2" | "h3";
}) {
  const color = tone === "ember" ? "text-ember" : tone === "light" ? "text-cream/70" : "text-ink3";
  return (
    <Tag className={`text-[10.5px] font-bold uppercase leading-tight tracking-[0.14em] ${color} ${className}`}>
      {children}
    </Tag>
  );
}

export function Heading({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h1 className={`text-[26px] font-extrabold leading-[1.12] tracking-[-0.03em] text-ink ${className}`}>
      {children}
    </h1>
  );
}

export function Sub({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[15px] leading-relaxed text-ink2 ${className}`}>{children}</p>;
}
