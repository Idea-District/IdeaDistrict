import type { Confidence } from "@idea-district/api-client";

const color: Record<Confidence, string> = { high: "text-good", medium: "text-mid", low: "text-ink3" };

export function ConfidenceWord({ value, className = "" }: { value: Confidence; className?: string }) {
  return (
    <span className={`text-[10.5px] font-bold uppercase tracking-[0.14em] ${color[value]} ${className}`}>{value}</span>
  );
}

export function StrengthBar({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className="h-1 w-full overflow-hidden rounded-full bg-rule"
    >
      <div className="h-full rounded-full bg-ember" style={{ width: `${pct}%` }} />
    </div>
  );
}
