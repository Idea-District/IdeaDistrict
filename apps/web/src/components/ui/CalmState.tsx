import { IdMark } from "./IdMark";

/** A designed waiting state: AI latency should read as work, not as a spinner. */
export function CalmState({ title, sub }: { title: string; sub?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <IdMark size={40} className="animate-pulse" />
      <p className="text-[17px] font-extrabold tracking-[-0.02em] text-ink">{title}</p>
      {sub ? <p className="max-w-[280px] text-[13.5px] leading-relaxed text-ink3">{sub}</p> : null}
    </div>
  );
}
