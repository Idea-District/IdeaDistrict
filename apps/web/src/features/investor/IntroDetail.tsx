"use client";

import Link from "next/link";
import { useState } from "react";

import type { ConnectionRequestItem } from "@idea-district/api-client";

import { Button, ErrorNotice } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { personLine, shortDate } from "@/lib/format";

import { InvestorShell } from "./InvestorShell";
import { BackLink, card, focus, InvestorEyebrow, ROOM_NAMES, ROOMS, SectionTitle, ThesisFit, useLoad, Waiting } from "./parts";

const back = <BackLink href="/investor/dashboard" label="Dashboard" />;
const linkClass = `inline-flex min-h-[44px] items-center rounded text-[14.5px] font-bold text-espresso underline underline-offset-4 hover:text-ink ${focus}`;

/** I4 · One introduction: why they asked, how they fit, what they share. Accept or pass. */
export function IntroDetail({ investorId, requestId }: { investorId: string; requestId: string }) {
  const q = useLoad(() => api.investorIntroductions(investorId), `${investorId}:${requestId}`);
  const [busy, setBusy] = useState<"accept" | "pass" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConnectionRequestItem | null>(null);

  if (!q.data) return <Waiting error={q.error} retry={q.retry} title="Opening the introduction…" back={back} />;
  const intro = q.data.find((i) => i.request_id === requestId);

  if (result) {
    const accepted = result.status === "accepted";
    return (
      <InvestorShell wide={false}>
        {back}
        <div role="status" className="rounded-[20px] bg-espresso p-6 text-cream">
          <InvestorEyebrow onDark>{accepted ? "Accepted" : "Passed"}</InvestorEyebrow>
          <h1 className="mt-2 text-[26px] font-bold tracking-[-0.02em]">{accepted ? "Conversation open" : "Passed. They won’t be told why."}</h1>
          <p className="mt-2 text-[15px] text-cream/85">
            {accepted
              ? `You and ${result.person.name} can now message each other. They're in your pipeline as "In conversation".`
              : `${result.person.name} moves to "Passed" in your pipeline. You can change that later.`}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5">
          {accepted && result.conversation_id ? (
            <Link href={`/investor/messages/${result.conversation_id}`} className={linkClass}>
              Message {result.person.name}
            </Link>
          ) : null}
          <Link href={`/investor/founders/${result.person_id}`} className={linkClass}>
            View their District
          </Link>
          <Link href="/investor/dashboard" className={linkClass}>
            Back to the dashboard
          </Link>
        </div>
      </InvestorShell>
    );
  }

  if (!intro) {
    return (
      <InvestorShell wide={false}>
        {back}
        <div className={card}>
          <h1 className="text-[20px] font-bold text-ink">This introduction has been answered</h1>
          <p className="mt-2 text-[15px] text-ink2">It isn&rsquo;t waiting any more. You&rsquo;ll find the founder in your pipeline.</p>
          <Link href="/investor/pipeline" className={linkClass}>
            Open the pipeline
          </Link>
        </div>
      </InvestorShell>
    );
  }

  async function respond(accept: boolean) {
    setBusy(accept ? "accept" : "pass");
    setError(null);
    try {
      setResult(await api.respondToIntro(requestId, investorId, accept));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <InvestorShell wide={false}>
      {back}
      <header className="rounded-[20px] bg-espresso p-5 text-cream lg:p-7">
        <InvestorEyebrow onDark>Introduction · {shortDate(intro.sent_at)}</InvestorEyebrow>
        <h1 className="mt-2 text-[28px] font-bold leading-[1.1] tracking-[-0.02em]">{intro.person.name}</h1>
        <p className="mt-1.5 text-[15px] text-cream/85">{personLine(intro.person)}</p>
      </header>

      <section aria-labelledby="why" className={`${card} mt-5`}>
        <SectionTitle id="why">Why you&rsquo;re meeting</SectionTitle>
        <p className="mt-2 text-[16px] leading-relaxed text-ink">{intro.why}</p>
        <div className="mt-3">
          <ThesisFit fit={intro.thesis_fit} />
        </div>
      </section>

      <section aria-labelledby="shares" className={`${card} mt-4`}>
        <SectionTitle id="shares">What they share with investors</SectionTitle>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ROOMS.map((r) => {
            const on = intro.shares_rooms.includes(r);
            return (
              <li key={r} className={`rounded-[10px] border px-3 py-2.5 text-[14px] ${on ? "border-espresso bg-cream font-bold text-ink" : "border-dashed border-rule text-ink3"}`}>
                {ROOM_NAMES[r]}
                <span className="block text-[12px] font-normal">{on ? "Shared" : "Not shared"}</span>
              </li>
            );
          })}
        </ul>
        <Link href={`/investor/founders/${intro.founder_id}`} className={linkClass}>
          View their District
        </Link>
      </section>

      {error ? (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      ) : null}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Button variant="dark" onClick={() => void respond(true)} disabled={busy !== null}>
          {busy === "accept" ? "Accepting…" : "Accept and open a conversation"}
        </Button>
        <Button variant="secondary" onClick={() => void respond(false)} disabled={busy !== null}>
          {busy === "pass" ? "Passing…" : "Pass"}
        </Button>
      </div>
      <p className="mt-2 text-[13px] text-ink3">If you pass, they won&rsquo;t be told why.</p>
    </InvestorShell>
  );
}
