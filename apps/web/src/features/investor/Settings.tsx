"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui";
import { api } from "@/lib/api";
import { investorSession } from "@/lib/investorSession";

import { InvestorShell } from "./InvestorShell";
import { card, focus, PageTitle, SectionTitle, useLoad, Waiting } from "./parts";

/** I10 · Profile, thesis link and sign out. */
export function Settings({ investorId }: { investorId: string }) {
  const router = useRouter();
  const q = useLoad(() => api.investorThesis(investorId), investorId);
  if (!q.data) return <Waiting error={q.error} retry={q.retry} title="Opening settings…" />;
  const t = q.data;

  function signOut() {
    investorSession.signOut();
    router.replace("/investor");
  }

  return (
    <InvestorShell wide={false}>
      <PageTitle title="Settings" />
      <section aria-labelledby="profile" className={card}>
        <SectionTitle id="profile">Profile</SectionTitle>
        <dl className="mt-3 divide-y divide-rule">
          <div className="flex justify-between gap-3 py-2">
            <dt className="text-[14px] text-ink3">Name</dt>
            <dd className="text-[15px] font-bold text-ink">{t.name}</dd>
          </div>
          <div className="flex justify-between gap-3 py-2">
            <dt className="text-[14px] text-ink3">Firm</dt>
            <dd className="text-[15px] font-bold text-ink">{t.firm || "Not set"}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="thesis" className={`${card} mt-4`}>
        <SectionTitle id="thesis">Thesis</SectionTitle>
        <p className="mt-2 text-[14.5px] text-ink2">
          {t.sectors.length ? `Sectors: ${t.sectors.join(", ")}.` : "No sectors yet."} {t.cheque ? `Cheque: ${t.cheque}.` : ""}
        </p>
        <Link href="/investor/thesis" className={`inline-flex min-h-[44px] items-center rounded text-[14.5px] font-bold text-espresso underline underline-offset-4 ${focus}`}>
          Edit your thesis
        </Link>
      </section>

      <Button variant="secondary" className="mt-6" onClick={signOut}>
        Sign out
      </Button>
    </InvestorShell>
  );
}
