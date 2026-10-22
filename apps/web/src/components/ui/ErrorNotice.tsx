import { Button } from "./Button";

/** Inline error with a retry. Never a blank screen. */
export function ErrorNotice({
  message,
  onRetry,
  retryLabel = "Try again",
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div role="alert" className="rounded-2xl border border-ember/40 bg-ember-tint px-[15px] py-[14px]">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ember">Something went wrong</p>
      <p className="mt-1 text-[14px] leading-relaxed text-ink">{message}</p>
      {onRetry ? (
        <Button variant="dark" className="mt-3" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
