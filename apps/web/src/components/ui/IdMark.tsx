import { brandMark } from "@idea-district/design-tokens";

/* The Idea District mark (Logo 01). `size` is the height in px; width follows the mark's proportions. */
export function IdMark({ size = 44, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox={brandMark.viewBox}
      width={Math.round(size * brandMark.aspectRatio)}
      height={size}
      className={`shrink-0 text-ember ${className}`}
      fill="currentColor"
      role="img"
      aria-label="Idea District"
    >
      <path fillRule="evenodd" d={brandMark.path} />
    </svg>
  );
}
