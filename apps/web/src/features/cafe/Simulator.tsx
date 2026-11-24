"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";

import type { Simulation } from "@idea-district/api-client";

import { AppShell, ErrorNotice, buttonClass } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

import { BackLink, focus, postedText, useLoad } from "./shared";

function Eyebrow() {
  return <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ember-deep">Test an assumption</p>;
}

/** D3 + D4 · Test an assumption: two paths, their trade-offs, a reflection, then save or keep private. */
export function Simulator({ founderId }: { founderId: string }) {
  const suggestions = useLoad(() => api.simSuggestions(founderId), founderId);
  const past = useLoad(() => api.simulations(founderId), founderId);

  const [assumption, setAssumption] = useState("");
  const [sim, setSim] = useState<Simulation | null>(null);
  const [picked, setPicked] = useState<"A" | "B" | null>(null);
  const [reflection, setReflection] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const assumptionId = useId();
  const reflectionId = useId();

  function open(s: Simulation) {
    setSim(s);
    setPicked(s.chosen);
    setReflection(s.reflection);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function run(e: FormEvent) {
    e.preventDefault();
    const text = assumption.trim();
    if (text.length < 8 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const s = await api.simulate(founderId, text);
      open(s);
      past.setData((list) => [s, ...(list ?? [])]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function decide(save: boolean) {
    if (!sim || !picked) return;
    setBusy(true);
    setError(null);
    try {
      const s = await api.decideSimulation(sim.id, { founder_id: founderId, chosen: picked, reflection, save_to_journey: save });
      setSim(s);
      past.setData((list) => list?.map((x) => (x.id === s.id ? s : x)) ?? [s]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function startAgain() {
    setSim(null);
    setPicked(null);
    setReflection("");
    setAssumption("");
    setError(null);
  }

  const decided = sim?.chosen != null && (sim.chosen === picked) && sim.reflection === reflection;

  return (
    <AppShell>
      <BackLink href="/quick-breaks" label="Quick Breaks room" />
      <Eyebrow />

      {!sim ? (
        <>
          <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.02em]">What are you assuming?</h1>
          <p className="mt-2 max-w-[56ch] text-[15px] text-ink2">
            Write one belief your plan depends on. ID lays out two ways to act on it and what each one trades. A thinking exercise, not a prediction, and private unless you save it.
          </p>
          <form onSubmit={run} className="mt-5 rounded-[16px] border border-rule bg-card p-5">
            <label htmlFor={assumptionId} className="text-[14px] font-bold">
              Your assumption
            </label>
            <textarea
              id={assumptionId}
              value={assumption}
              onChange={(e) => setAssumption(e.target.value)}
              rows={3}
              maxLength={400}
              placeholder="e.g. Other unit owners will pay for billing too."
              className="mt-2 w-full resize-y rounded-[12px] border border-rule bg-screen px-4 py-3 text-[15px] leading-relaxed focus:border-ink focus:outline-none"
            />
            {suggestions.data && suggestions.data.length > 0 ? (
              <div className="mt-3">
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink3">From your District</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestions.data.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setAssumption(s)}
                      className={`min-h-[40px] rounded-full border border-rule bg-screen px-4 py-2 text-left text-[13.5px] font-semibold hover:border-ink ${focus}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {error ? (
              <p role="alert" className="mt-3 text-[13.5px] text-ember-deep">
                {error}
              </p>
            ) : null}
            <button type="submit" disabled={busy || assumption.trim().length < 8} className={buttonClass("primary", "mt-4 w-auto px-6")}>
              {busy ? "Laying out two paths…" : "Lay out two paths"}
            </button>
          </form>
        </>
      ) : (
        <>
          <h1 className="mt-1 text-[24px] font-bold leading-snug tracking-[-0.01em] lg:text-[28px]">&ldquo;{sim.assumption}&rdquo;</h1>
          <p className="mt-1 text-[13px] text-ink3">
            A thinking exercise, not a prediction.{sim.grounded_in ? <> Based on: <span className="inferred">{sim.grounded_in}</span></> : null}
          </p>

          <div role="radiogroup" aria-label="Choose a path" className="mt-5 grid gap-3 md:grid-cols-2">
            {sim.paths.map((p) => {
              const on = picked === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setPicked(p.key)}
                  className={`flex flex-col gap-3 rounded-[16px] border-2 p-5 text-left ${on ? "border-ink bg-ember-tint" : "border-rule bg-card hover:border-ink3"} ${focus}`}
                >
                  <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink3">Path {p.key}</span>
                  <span className="text-[18px] font-bold leading-snug">{p.title}</span>
                  <span className="text-[14.5px] leading-relaxed text-ink2">{p.summary}</span>
                  <span className="flex flex-col gap-2 border-t border-rule2 pt-3">
                    {p.tradeoffs.map((t) => (
                      <span key={t.label} className="text-[14px] leading-snug">
                        <b>{t.label}.</b> {t.text}
                      </span>
                    ))}
                  </span>
                  {p.watch_for ? (
                    <span className="text-[13px] text-ink3">
                      <b className="text-ink2">Watch for:</b> {p.watch_for}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <section className="mt-5 rounded-[16px] bg-espresso p-5 text-cream">
            <label htmlFor={reflectionId} className="block text-[11px] font-bold uppercase tracking-[0.12em] text-ember-light">
              Before you choose
            </label>
            <p className="mt-1 text-[17px] font-semibold leading-snug">{sim.question}</p>
            <textarea
              id={reflectionId}
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              rows={3}
              maxLength={1500}
              placeholder="Your answer, for you."
              className="mt-3 w-full resize-y rounded-[12px] border border-cream/30 bg-espresso2 px-4 py-3 text-[15px] leading-relaxed text-cream placeholder:text-cream/60 focus:border-cream focus:outline-none"
            />
          </section>

          {error ? (
            <div className="mt-4">
              <ErrorNotice message={error} />
            </div>
          ) : null}

          {decided ? (
            <div role="status" className="mt-5 rounded-[16px] border border-rule bg-card p-5">
              <p className="text-[15px] font-bold">
                {sim.saved_to_journey ? "Saved to your Journey." : "Kept private. Only you can see this."}
              </p>
              <p className="mt-1 text-[14px] text-ink2">
                You chose path {sim.chosen}: {sim.paths.find((p) => p.key === sim.chosen)?.title}.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {sim.saved_to_journey ? (
                  <Link href="/district/journey" className={buttonClass("secondary", "w-auto px-5")}>
                    Open my Journey
                  </Link>
                ) : (
                  <button type="button" disabled={busy} onClick={() => void decide(true)} className={buttonClass("secondary", "w-auto px-5")}>
                    Save to Journey after all
                  </button>
                )}
                <Link href="/ask" className={buttonClass("ghost", "w-auto px-4")}>
                  Talk it through with ID
                </Link>
                <button type="button" onClick={startAgain} className={buttonClass("ghost", "w-auto px-4")}>
                  Test another assumption
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button type="button" disabled={busy || !picked} onClick={() => void decide(true)} className={buttonClass("primary", "w-auto px-6")}>
                Save to Journey
              </button>
              <button type="button" disabled={busy || !picked} onClick={() => void decide(false)} className={buttonClass("secondary", "w-auto px-6")}>
                Keep private
              </button>
              {!picked ? <p className="text-[13px] text-ink3">Pick a path first.</p> : null}
              <button type="button" onClick={startAgain} className={buttonClass("ghost", "w-auto px-4")}>
                Start again
              </button>
            </div>
          )}
        </>
      )}

      {past.data && past.data.filter((s) => s.id !== sim?.id).length > 0 ? (
        <section className="mt-10" aria-labelledby="past">
          <h2 id="past" className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink3">
            Assumptions you&rsquo;ve tested
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {past.data
              .filter((s) => s.id !== sim?.id)
              .map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => open(s)}
                    className={`flex w-full flex-col gap-0.5 rounded-[12px] border border-rule bg-card px-4 py-3 text-left hover:border-ink ${focus}`}
                  >
                    <span className="text-[15px] font-semibold">{s.assumption}</span>
                    <span className="text-[12.5px] text-ink3">
                      {postedText(s.created_at)} ·{" "}
                      {s.chosen ? `Chose ${s.paths.find((p) => p.key === s.chosen)?.title ?? s.chosen}` : "Not decided yet"}
                      {s.saved_to_journey ? " · in your Journey" : s.chosen ? " · private" : ""}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </AppShell>
  );
}
