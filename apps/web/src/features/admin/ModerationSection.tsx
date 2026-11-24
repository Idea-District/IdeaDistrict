"use client";

import type { AdminPost } from "@idea-district/api-client";

import { ErrorNotice } from "@/components/ui";

import { Card, Pill, smallButton, useAdminAction, whenLabel } from "./parts";

/** Moderation: recent Daily Brew answers and table posts. Hidden ones stay listed, dimmed. */
export function ModerationSection({ recent }: { recent: AdminPost[] }) {
  const { busy, error, run } = useAdminAction();
  const hiddenCount = recent.filter((p) => p.hidden).length;

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[18px] font-bold">Recent answers and posts</h2>
        <p className="text-[13px] text-ink3">
          {recent.length} recent · {hiddenCount} hidden
        </p>
      </div>
      <p className="mt-1 max-w-[62ch] text-[14px] text-ink2">Hiding removes a reply from the Cafe for everyone. You can unhide it here at any time.</p>
      {error ? (
        <div className="mt-3">
          <ErrorNotice message={error} />
        </div>
      ) : null}
      {recent.length === 0 ? (
        <p className="mt-4 text-[14.5px] text-ink2">Nothing posted yet.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {recent.map((p) => {
            const key = `${p.kind}:${p.id}`;
            return (
              <li key={key} className={`flex flex-col gap-3 rounded-[12px] border p-3.5 sm:flex-row sm:items-start ${p.hidden ? "border-dashed border-rule bg-screen/60" : "border-rule"}`}>
                <div className={`min-w-0 flex-1 ${p.hidden ? "opacity-60" : ""}`}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink3">
                    <Pill tone={p.kind === "answer" ? "plain" : "forest"}>{p.kind === "answer" ? "Brew answer" : "Table post"}</Pill>
                    {p.hidden ? <Pill tone="muted">Hidden</Pill> : null}
                    <span className="font-bold text-ink">{p.author}</span>
                    <span>{whenLabel(p.posted_at)}</span>
                  </div>
                  <p className={`mt-1.5 whitespace-pre-line text-[14.5px] leading-snug ${p.hidden ? "text-ink2 line-through decoration-ink3/50" : "text-ink"}`}>{p.body}</p>
                </div>
                <button
                  type="button"
                  className={smallButton(p.hidden ? "secondary" : "danger", "shrink-0 self-start")}
                  disabled={busy !== null}
                  onClick={() => run(key, (c) => c.moderate({ kind: p.kind, id: p.id, hidden: !p.hidden }))}
                  aria-label={`${p.hidden ? "Unhide" : "Hide"} the ${p.kind === "answer" ? "answer" : "post"} by ${p.author}`}
                >
                  {busy === key ? "Saving…" : p.hidden ? "Unhide" : "Hide"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
