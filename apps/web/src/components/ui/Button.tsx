import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

type Variant = "primary" | "dark" | "secondary" | "ghost";

const base =
  "inline-flex w-full items-center justify-center gap-2 rounded-[10px] px-4 py-[13px] text-[15px] font-bold transition-[background-color,opacity,transform] duration-150 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember";

const variants: Record<Variant, string> = {
  primary: "bg-ember text-ink hover:bg-[#e83c02]",
  dark: "bg-espresso text-cream hover:bg-espresso2",
  secondary: "border border-rule bg-card text-ink hover:bg-sand2",
  ghost: "bg-transparent text-ink3 hover:text-ink",
};

export function buttonClass(variant: Variant = "primary", className = "") {
  // Full width by default; pass "w-auto" for a button that fits its label.
  const b = /\bw-auto\b/.test(className) ? base.replace("w-full ", "") : base;
  return `${b} ${variants[variant]} ${className}`;
}

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
