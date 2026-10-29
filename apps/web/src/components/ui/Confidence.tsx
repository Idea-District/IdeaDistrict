import type { Confidence } from "@idea-district/api-client";

const color: Record<Confidence, string> = { high: "text-good", medium: "text-mid", low: "text-ink3" };

/** Small-caps confidence word. Used for the AI's confidence in an introduction. */
export function ConfidenceWord({ value, className = "" }: { value: Confidence; className?: string }) {
  return (
    <span className={`text-[10.5px] font-bold uppercase tracking-[0.14em] ${color[value]} ${className}`}>{value}</span>
  );
}

const readWords: Record<Confidence, string> = {
  low: "Early read",
  medium: "Emerging pattern",
  high: "Consistent pattern",
};

/**
 * How settled a read of the person is, in words — never a score. Little evidence should
 * never look like certainty.
 */
export function ReadStrength({ value, className = "" }: { value: Confidence; className?: string }) {
  return <span className={`text-[12.5px] font-bold ${color[value]} ${className}`}>{readWords[value]}</span>;
}
