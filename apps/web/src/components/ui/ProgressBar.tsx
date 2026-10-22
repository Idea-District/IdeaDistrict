export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="progressbar"
      aria-label={label ?? "Progress"}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className="h-[5px] w-full overflow-hidden rounded-full bg-rule"
    >
      <div className="h-full rounded-full bg-ember transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
    </div>
  );
}
