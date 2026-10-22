export function IdMark({ size = 44, className = "" }: { size?: number; className?: string }) {
  return (
    <div
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-[13px] bg-ember font-extrabold tracking-[-0.03em] text-white ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      ID
    </div>
  );
}
