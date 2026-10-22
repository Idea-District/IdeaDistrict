"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { KnownUnknown } from "@idea-district/api-client";

import { Button, CalmState, ErrorNotice, Heading, PhoneFrame, ProgressBar, Row, Rows, Section, Sub, Tag } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { memory, session } from "@/lib/session";

/** Screen 4: what we know (declared) and what we don't know yet. */
export function KnownUnknownScreen({ founderId }: { founderId: string }) {
  const router = useRouter();
  const [data, setData] = useState<KnownUnknown | null>(memory.known);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const loadRef = useRef<Promise<KnownUnknown> | null>(null);

  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    if (data) return;
    loadRef.current ??= api.knownUnknown(founderId);
    let active = true;
    loadRef.current.then(
      (r) => active && setData(r),
      (e) => {
        loadRef.current = null;
        if (active) setLoadError(errorMessage(e));
      },
    );
    return () => {
      active = false;
    };
  }, [data, founderId, attempt]);

  async function begin() {
    setStarting(true);
    setStartError(null);
    try {
      const first = await api.startSession(founderId);
      session.setSessionId(first.session_id);
      memory.firstSituation = first;
      router.push("/discover");
    } catch (e) {
      setStartError(errorMessage(e));
      setStarting(false);
    }
  }

  if (starting) {
    return (
      <PhoneFrame>
        <CalmState title="Writing your first situation…" sub="Built from what you just told us. This takes a few seconds." />
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <ProgressBar value={0.3} label="Discovery progress" />
      <Heading className="mt-6">Your ID is starting to take shape.</Heading>
      <Sub className="mt-2">We know where you are. Not yet how you operate.</Sub>

      {loadError ? (
        <div className="mt-6">
          <ErrorNotice
            message={loadError}
            onRetry={() => {
              setLoadError(null);
              setAttempt((n) => n + 1);
            }}
          />
        </div>
      ) : !data ? (
        <CalmState title="Reading what you told us…" />
      ) : (
        <div className="fade-in mt-6 flex flex-col gap-3">
          <Section title="What we know">
            <Rows>
              {data.known.map((k, i) => (
                <Row key={`${k.dimension}-${i}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[14px] font-bold">{k.dimension}</p>
                    <Tag kind="declared" />
                  </div>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink2">{k.text}</p>
                </Row>
              ))}
            </Rows>
          </Section>
          <Section title="What we don't know yet" titleTone="ember">
            <Rows>
              {data.unknown.map((u, i) => (
                <Row key={`${u.dimension}-${i}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[14px] font-bold">{u.label}</p>
                    <Tag kind="unknown" />
                  </div>
                </Row>
              ))}
            </Rows>
          </Section>
        </div>
      )}

      {startError ? (
        <div className="mt-4">
          <ErrorNotice message={startError} />
        </div>
      ) : null}

      <div className="mt-auto pt-8">
        <Button onClick={begin} disabled={!data}>
          {startError ? "Try again" : "Discover something about me"}
        </Button>
      </div>
    </PhoneFrame>
  );
}
