"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import type { InvestorAccount } from "@idea-district/api-client";

import { Button, CalmState, ErrorNotice, IdMark } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { investorSession } from "@/lib/investorSession";

import { focus, InvestorEyebrow, inputClass, PersonDot, useLoad } from "./parts";

/** I1 · Invite-only sign-in: pick a demo investor or create one. */
export function SignIn() {
  const router = useRouter();
  const accounts = useLoad(() => api.investorDemoAccounts(), "accounts");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [firm, setFirm] = useState("");
  const nameId = useId();
  const firmId = useId();

  async function enter(acc: InvestorAccount) {
    setBusy(acc.id);
    setError(null);
    try {
      const home = await api.investorHome(acc.id);
      investorSession.setInvestor(acc.id, acc.name);
      router.push(home.has_thesis ? "/investor/dashboard" : "/investor/thesis");
    } catch (e) {
      setError(errorMessage(e));
      setBusy(null);
    }
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !firm.trim()) return;
    setBusy("new");
    setError(null);
    try {
      const acc = await api.createInvestor(name.trim(), firm.trim());
      investorSession.setInvestor(acc.id, acc.name);
      router.push("/investor/thesis");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(null);
    }
  }

  return (
    <div className="flex min-h-dvh w-full flex-col bg-screen lg:flex-row">
      <section className="bg-espresso px-6 py-10 text-cream lg:flex lg:w-[44%] lg:flex-col lg:justify-between lg:px-12 lg:py-14">
        <div className="flex items-center gap-3">
          <IdMark size={34} className="!text-cream" />
          <span className="text-[11px] font-bold tracking-[0.22em]">IDEA DISTRICT</span>
        </div>
        <div className="mt-10 lg:mt-0">
          <InvestorEyebrow onDark>Investor · by invitation</InvestorEyebrow>
          <h1 className="mt-3 text-[32px] font-bold leading-[1.08] tracking-[-0.02em] lg:text-[40px]">
            Founders come to you. You never browse them.
          </h1>
          <p className="mt-4 max-w-[440px] text-[15.5px] leading-relaxed text-cream/85">
            Idea District introduces a founder to you only when they are raising, have opted in to meeting investors, and asked to
            meet you. You see the rooms of their District they chose to share, and nothing else.
          </p>
        </div>
        <p className="mt-10 text-[13px] text-cream/70 lg:mt-0">Investor access is invite-only.</p>
      </section>

      <main className="flex flex-1 justify-center px-5 py-10 lg:items-center lg:px-12">
        <div className="w-full max-w-[520px]">
          <h2 className="text-[22px] font-bold tracking-[-0.02em] text-ink">Sign in</h2>
          <p className="mt-1 text-[14px] text-ink3">In the live product this is a work-email sign-in code.</p>

          {error ? (
            <div className="mt-5">
              <ErrorNotice message={error} />
            </div>
          ) : null}

          <section aria-labelledby="demo-accounts" className="mt-6">
            <h3 id="demo-accounts" className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink3">
              Demo investor accounts
            </h3>
            {!accounts.data ? (
              accounts.error ? (
                <div className="mt-3">
                  <ErrorNotice message={accounts.error} onRetry={accounts.retry} />
                </div>
              ) : (
                <CalmState title="Finding invited investors…" />
              )
            ) : accounts.data.length === 0 ? (
              <p className="mt-3 text-[14px] text-ink2">No demo accounts yet. Create one below.</p>
            ) : (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {accounts.data.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => void enter(a)}
                      disabled={busy !== null}
                      className={`flex min-h-[56px] w-full items-center gap-3 rounded-[12px] border border-rule bg-card px-3 py-2 text-left hover:border-espresso disabled:opacity-60 ${focus}`}
                    >
                      <PersonDot person={a} size={34} />
                      <span className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate text-[14.5px] font-bold text-ink">{busy === a.id ? "Signing in…" : a.name}</span>
                        <span className="truncate text-[12.5px] text-ink3">{a.firm}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <form onSubmit={create} className="mt-8 rounded-[16px] border border-rule bg-card p-5" aria-labelledby="create-heading">
            <h3 id="create-heading" className="text-[17px] font-bold text-ink">
              Create an investor account
            </h3>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label htmlFor={nameId} className="mb-1 block text-[13.5px] font-semibold text-ink2">
                  Your name
                </label>
                <input id={nameId} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={inputClass} required />
              </div>
              <div>
                <label htmlFor={firmId} className="mb-1 block text-[13.5px] font-semibold text-ink2">
                  Firm
                </label>
                <input id={firmId} value={firm} onChange={(e) => setFirm(e.target.value)} autoComplete="organization" className={inputClass} required />
              </div>
              <Button type="submit" variant="dark" disabled={busy !== null || !name.trim() || !firm.trim()}>
                {busy === "new" ? "Creating…" : "Create and set your thesis"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
