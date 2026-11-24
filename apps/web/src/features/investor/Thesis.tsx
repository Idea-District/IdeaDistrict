"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import type { InvestorThesis } from "@idea-district/api-client";

import { Button, ErrorNotice } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

import { InvestorShell } from "./InvestorShell";
import { card, focus, inputClass, PageTitle, useLoad, Waiting } from "./parts";

const SECTOR_IDEAS = ["fintech", "healthtech", "edtech", "climate", "saas", "inventory", "logistics", "d2c", "agritech", "deeptech", "mobility"];
const STAGE_OPTIONS = [
  { value: "pre-seed", label: "Pre-seed" },
  { value: "seed", label: "Seed" },
  { value: "series a", label: "Series A" },
];
const CHEQUES = ["Under ₹50L", "₹50L–2Cr", "₹2–5Cr", "₹5Cr+"];

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-[44px] rounded-full border px-4 text-[14px] font-semibold ${focus} ${
        on ? "border-espresso bg-espresso text-cream" : "border-rule bg-card text-ink2 hover:border-ink"
      }`}
    >
      {children}
    </button>
  );
}

/** I2 · The investor's thesis: what they look for, so introductions can say how a founder fits. */
export function Thesis({ investorId }: { investorId: string }) {
  const q = useLoad(() => api.investorThesis(investorId), investorId);
  if (!q.data) return <Waiting error={q.error} retry={q.retry} title="Opening your thesis…" />;
  return <ThesisForm investorId={investorId} initial={q.data} />;
}

function ThesisForm({ investorId, initial }: { investorId: string; initial: InvestorThesis }) {
  const router = useRouter();
  const [firm, setFirm] = useState(initial.firm);
  const [sectors, setSectors] = useState<string[]>(initial.sectors);
  const [stages, setStages] = useState<string[]>(initial.stages);
  const [cheque, setCheque] = useState(initial.cheque);
  const [geography, setGeography] = useState(initial.geography || "India");
  const [own, setOwn] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firmId = useId();
  const ownId = useId();
  const geoId = useId();

  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const allSectors = [...SECTOR_IDEAS, ...sectors.filter((s) => !SECTOR_IDEAS.includes(s))];

  function addOwn() {
    const v = own.trim().toLowerCase();
    if (v && !sectors.includes(v)) setSectors([...sectors, v]);
    setOwn("");
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!sectors.length) {
      setError("Pick at least one sector, so introductions can say how a founder fits.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.setInvestorThesis(investorId, { firm: firm.trim(), sectors, stages, cheque, geography: geography.trim() });
      router.push("/investor/dashboard");
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <InvestorShell wide={false}>
      <PageTitle
        eyebrow="Your thesis"
        title={`What do you back, ${initial.name.split(" ")[0]}?`}
        sub="We use this only to tell you, in words, how an introduced founder fits. It never makes founders browsable."
      />
      <form onSubmit={save} className="flex flex-col gap-5">
        <div className={card}>
          <label htmlFor={firmId} className="mb-1 block text-[14px] font-bold text-ink">
            Firm
          </label>
          <input id={firmId} value={firm} onChange={(e) => setFirm(e.target.value)} className={inputClass} required />
        </div>

        <fieldset className={card}>
          <legend className="float-left mb-3 w-full text-[14px] font-bold text-ink">Sectors</legend>
          <div className="clear-both flex flex-wrap gap-2">
            {allSectors.map((s) => (
              <Chip key={s} on={sectors.includes(s)} onClick={() => toggle(sectors, setSectors, s)}>
                {s}
              </Chip>
            ))}
          </div>
          <div className="mt-4 flex items-end gap-2">
            <div className="flex-1">
              <label htmlFor={ownId} className="mb-1 block text-[13.5px] font-semibold text-ink2">
                Add your own
              </label>
              <input
                id={ownId}
                value={own}
                onChange={(e) => setOwn(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addOwn();
                  }
                }}
                placeholder="e.g. insurtech"
                className={inputClass}
              />
            </div>
            <Button variant="secondary" className="w-auto" onClick={addOwn} disabled={!own.trim()}>
              Add
            </Button>
          </div>
        </fieldset>

        <fieldset className={card}>
          <legend className="float-left mb-3 w-full text-[14px] font-bold text-ink">Stages</legend>
          <div className="clear-both flex flex-wrap gap-2">
            {STAGE_OPTIONS.map((s) => (
              <Chip key={s.value} on={stages.includes(s.value)} onClick={() => toggle(stages, setStages, s.value)}>
                {s.label}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className={card}>
          <legend className="float-left mb-3 w-full text-[14px] font-bold text-ink">Cheque size</legend>
          <div className="clear-both grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CHEQUES.map((c) => (
              <label
                key={c}
                className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-[10px] border px-3 text-[14px] font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ember ${
                  cheque === c ? "border-espresso bg-espresso text-cream" : "border-rule bg-card text-ink2 hover:border-ink"
                }`}
              >
                <input type="radio" name="cheque" value={c} checked={cheque === c} onChange={() => setCheque(c)} className="sr-only" />
                {c}
              </label>
            ))}
          </div>
        </fieldset>

        <div className={card}>
          <label htmlFor={geoId} className="mb-1 block text-[14px] font-bold text-ink">
            Geography
          </label>
          <input id={geoId} value={geography} onChange={(e) => setGeography(e.target.value)} placeholder="e.g. India, Bengaluru first" className={inputClass} />
        </div>

        {error ? <ErrorNotice message={error} /> : null}
        <Button type="submit" variant="dark" disabled={saving}>
          {saving ? "Saving…" : "Save thesis"}
        </Button>
      </form>
    </InvestorShell>
  );
}
