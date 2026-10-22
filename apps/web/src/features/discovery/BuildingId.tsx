"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { FounderID } from "@idea-district/api-client";

import { ErrorNotice, Heading, IdMark, PhoneFrame, Sub } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

const steps = [
  "Reading your decisions",
  "Finding what you consistently avoid",
  "Separating who you are from what's happening",
  "Working out what we still don't know",
  "Looking for intersections",
];

const STEP_MS = 2200;

/** Screen 9: covers the two ID-build AI calls. Rows never finish before the call does. */
export function BuildingId({ founderId }: { founderId: string }) {
  const router = useRouter();
  const [active, setActive] = useState(0); // index of the row currently "now"
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const buildRef = useRef<Promise<FounderID> | null>(null);

  // Advance rows on a timer, holding on the last one until the build resolves.
  useEffect(() => {
    if (finished || error) return;
    const t = window.setInterval(() => setActive((i) => Math.min(i + 1, steps.length - 1)), STEP_MS);
    return () => window.clearInterval(t);
  }, [finished, error]);

  useEffect(() => {
    buildRef.current ??= api.buildId(founderId);
    let live = true;
    let go: number | undefined;
    buildRef.current.then(
      () => {
        if (!live) return;
        setFinished(true);
        setActive(steps.length);
        go = window.setTimeout(() => router.replace("/id"), 900);
      },
      (e) => {
        buildRef.current = null;
        if (live) setError(errorMessage(e));
      },
    );
    return () => {
      live = false;
      window.clearTimeout(go);
    };
  }, [founderId, attempt, router]);

  return (
    <PhoneFrame>
      <IdMark className={finished ? "" : "animate-pulse"} />
      <Heading className="mt-6">{finished ? "Your ID is ready." : "Building your ID…"}</Heading>
      <Sub className="mt-2">From what you did, not just what you said.</Sub>

      <ol className="mt-8 flex flex-col gap-4" aria-live="polite">
        {steps.map((s, i) => {
          const state = i < active ? "done" : i === active ? "now" : "todo";
          return (
            <li key={s} className={`flex items-center gap-3 transition-opacity duration-500 ${state === "todo" ? "opacity-40" : "opacity-100"}`}>
              <span
                aria-hidden
                className={`size-2.5 shrink-0 rounded-full transition-colors duration-500 ${
                  state === "done" ? "bg-good" : state === "now" ? "animate-pulse bg-ember" : "bg-rule"
                }`}
              />
              <span className={`text-[15px] ${state === "now" ? "font-bold text-ink" : "text-ink2"}`}>
                {s}
                <span className="sr-only">{state === "done" ? " — done" : state === "now" ? " — in progress" : ""}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {error ? (
        <div className="mt-8">
          <ErrorNotice
            message={error}
            onRetry={() => {
              setError(null);
              setActive(0);
              setAttempt((n) => n + 1);
            }}
          />
        </div>
      ) : null}
    </PhoneFrame>
  );
}
