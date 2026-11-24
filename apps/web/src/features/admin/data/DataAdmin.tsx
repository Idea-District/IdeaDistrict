"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { CalmState, ErrorNotice, IdMark } from "@/components/ui";
import {
  adminErrorMessage,
  createAdminApi,
  isAuthError,
  type AdminApi,
  type ConnectionRow,
  type ConversationRow,
  type Counts,
  type DataSummary,
  type EventRow,
  type FounderDetail,
  type FounderRow,
  type InvestorDetail,
  type InvestorRow,
  type PersonRef,
} from "@/lib/adminApi";

import { clearAdminToken, saveAdminToken, useAdminToken } from "../adminToken";
import { AdminNav, TokenGate } from "../CafeAdmin";
import { Card, focus, inputClass, Pill, smallButton, whenLabel } from "../parts";

/*
 * Users & data: everyone in the community, for the team. Contact details and what founders told us
 * are here; message text never is (the API doesn't send it).
 */

type Loaded<T> = { data: T | null; error: string | null };

/** Load something with the admin client; a rejected token signs out. */
function useAdminLoad<T>(client: AdminApi | null, load: (c: AdminApi) => Promise<T>, key: string, onAuthLost: (m: string) => void): Loaded<T> & { retry: () => void } {
  const [state, setState] = useState<Loaded<T> & { key: string }>({ data: null, error: null, key: "" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!client) return;
    let live = true;
    load(client).then(
      (data) => live && setState({ data, error: null, key }),
      (e) => {
        if (!live) return;
        if (isAuthError(e)) onAuthLost(adminErrorMessage(e));
        else setState({ data: null, error: adminErrorMessage(e), key });
      },
    );
    return () => {
      live = false;
    };
    // `load` is a fresh closure each render; `key` says when it really changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, key, attempt, onAuthLost]);
  const fresh = state.key === key;
  return { data: fresh ? state.data : null, error: fresh ? state.error : null, retry: () => setAttempt((a) => a + 1) };
}

/** The admin frame: header, Cafe / Users & data switch, and the token gate. */
function Frame({ children }: { children: (client: AdminApi, onAuthLost: (m: string) => void) => ReactNode }) {
  const token = useAdminToken();
  const [gate, setGate] = useState<string | null>(null);
  const client = useMemo(() => (token ? createAdminApi(token) : null), [token]);
  const [onAuthLost] = useState(() => (m: string) => {
    clearAdminToken();
    setGate(m);
  });
  let body: ReactNode;
  if (token === undefined) body = <CalmState title="Opening the admin" />;
  else if (token === null || !client)
    body = (
      <TokenGate
        message={gate}
        onSubmit={(t) => {
          setGate(null);
          saveAdminToken(t);
        }}
      />
    );
  else body = children(client, onAuthLost);
  return (
    <div className="flex min-h-full flex-1 flex-col bg-screen text-ink">
      <div className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col px-4 py-5 sm:px-6 lg:py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
          <div className="flex items-center gap-3">
            <IdMark size={30} />
            <h1 className="text-[20px] font-extrabold leading-tight tracking-[-0.02em]">Admin</h1>
          </div>
          {token ? <AdminNav current="data" /> : null}
          {token ? (
            <button type="button" className={smallButton()} onClick={() => clearAdminToken()}>
              Sign out
            </button>
          ) : null}
        </header>
        {body}
      </div>
    </div>
  );
}

// ── Small pieces ───────────────────────────────────────────────────────

const LABELS: Record<string, string> = {
  id_built: "ID built",
  ai_calls: "AI calls",
  no_match: "No match found",
  suggestions_shown: "Suggestions made",
  messages_7_days: "Messages this week",
  opportunity_interest: "Interest in opportunities",
  opportunities: "Live opportunities",
  in_pipeline: "Founders in pipelines",
};
const human = (key: string) => LABELS[key] ?? key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-[13px] font-bold uppercase tracking-[0.12em] text-ink3">{title}</h2>
      {sub ? <p className="mt-0.5 text-[13px] text-ink3">{sub}</p> : null}
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

function Stat({ label, value, strong = false }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className={`rounded-[14px] border px-4 py-3 ${strong ? "border-espresso bg-espresso text-cream" : "border-rule bg-card"}`}>
      <p className={`text-[12px] font-semibold ${strong ? "text-cream/75" : "text-ink3"}`}>{label}</p>
      <p className="mt-0.5 text-[24px] font-extrabold leading-tight tracking-[-0.02em]">{value}</p>
    </div>
  );
}

function CountGrid({ counts }: { counts: Counts }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {Object.entries(counts).map(([k, v]) => (
        <Stat key={k} label={human(k)} value={v} />
      ))}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-[12px] border border-dashed border-rule px-4 py-3 text-[14px] text-ink3">{children}</p>;
}

function KV({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex flex-col border-b border-rule/70 pb-2">
          <dt className="text-[12px] font-semibold text-ink3">{k}</dt>
          <dd className="text-[14.5px] break-words">{v || <span className="text-ink3">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

function Who({ p }: { p: PersonRef }) {
  if (!p) return <span className="text-ink3">Someone who left</span>;
  const href = p.type === "investor" ? `/admin/data/investors/${p.id}` : `/admin/data/founders/${p.id}`;
  return (
    <Link href={href} className={`font-bold underline decoration-rule underline-offset-2 hover:decoration-ink ${focus}`}>
      {p.name}
      {p.type === "investor" ? <span className="ml-1 text-[12px] font-semibold text-ink3">(investor)</span> : null}
    </Link>
  );
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-[14px] border border-rule bg-card">
      <table className="w-full min-w-[720px] text-left text-[14px]">
        <thead className="border-b border-rule bg-sand2/60 text-[12px] uppercase tracking-[0.08em] text-ink3">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-3 py-2.5 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-rule/70">{children}</tbody>
      </table>
    </div>
  );
}

const td = "px-3 py-2.5 align-top";
const dateOnly = (iso: string | null | undefined) => (iso ? (whenLabel(iso) ?? "").split(",")[0] : "—");

function Connections({ rows }: { rows: ConnectionRow[] }) {
  if (!rows.length) return <Empty>No requests yet.</Empty>;
  return (
    <Table head={["With", "Direction", "Status", "How", "Note", "Sent"]}>
      {rows.map((r) => (
        <tr key={r.id}>
          <td className={td}>
            <Who p={r.with} />
          </td>
          <td className={td}>{r.direction}</td>
          <td className={td}>
            <Pill tone={r.status === "accepted" ? "forest" : r.status === "pending" ? "tint" : "muted"}>{r.status}</Pill>
          </td>
          <td className={td}>{r.origin}</td>
          <td className={`${td} max-w-[260px] text-ink2`}>{r.note || "—"}</td>
          <td className={td}>{dateOnly(r.sent_at)}</td>
        </tr>
      ))}
    </Table>
  );
}

function Conversations({ rows }: { rows: ConversationRow[] }) {
  if (!rows.length) return <Empty>No conversations yet.</Empty>;
  return (
    <Table head={["With", "Messages", "Sent by them", "Started", "Last message"]}>
      {rows.map((c) => (
        <tr key={c.id}>
          <td className={td}>
            {c.with.map((p, i) => (
              <Who key={p?.id ?? i} p={p} />
            ))}
          </td>
          <td className={td}>{c.messages}</td>
          <td className={td}>{c.sent_by_them}</td>
          <td className={td}>{dateOnly(c.started_at)}</td>
          <td className={td}>{whenLabel(c.last_message_at) ?? "—"}</td>
        </tr>
      ))}
    </Table>
  );
}

function Events({ rows }: { rows: EventRow[] }) {
  if (!rows.length) return <Empty>Nothing recorded yet.</Empty>;
  return (
    <Card>
      <ul className="flex flex-col gap-1.5 text-[13.5px]">
        {rows.map((e, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span>{human(e.event)}</span>
            <span className="shrink-0 text-ink3">{whenLabel(e.at)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Back() {
  return (
    <Link href="/admin/data" className={`mb-4 inline-flex min-h-[40px] items-center gap-1.5 text-[14px] font-bold text-ink2 hover:text-ink ${focus}`}>
      <span aria-hidden>←</span> Everyone
    </Link>
  );
}

function Loading({ state, title, children }: { state: Loaded<unknown> & { retry: () => void }; title: string; children: () => ReactNode }) {
  if (state.error) return <ErrorNotice message={state.error} onRetry={state.retry} />;
  if (!state.data) return <CalmState title={title} />;
  return <>{children()}</>;
}

// ── Overview: the numbers, then everyone ────────────────────────────────

function Overview({ client, onAuthLost }: { client: AdminApi; onAuthLost: (m: string) => void }) {
  const summary = useAdminLoad(client, (c) => c.dataSummary(), "summary", onAuthLost);
  const founders = useAdminLoad(client, (c) => c.dataFounders(), "founders", onAuthLost);
  const investors = useAdminLoad(client, (c) => c.dataInvestors(), "investors", onAuthLost);
  const [tab, setTab] = useState<"founders" | "investors">("founders");
  const [q, setQ] = useState("");
  const match = (...fields: (string | null | undefined)[]) => !q.trim() || fields.some((f) => f?.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <>
      <Loading state={summary} title="Counting everyone">
        {() => <Numbers s={summary.data as DataSummary} />}
      </Loading>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="People" className="flex gap-2">
            {(["founders", "investors"] as const).map((t) => {
              const n = t === "founders" ? founders.data?.length : investors.data?.length;
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[14px] font-bold ${focus} ${
                    tab === t ? "bg-espresso text-cream" : "border border-rule bg-card text-ink hover:bg-sand2"
                  }`}
                >
                  {t === "founders" ? "Founders" : "Investors"}
                  {n !== undefined ? <span className={`rounded-full px-1.5 text-[11.5px] ${tab === t ? "bg-cream/15" : "bg-sand2 text-ink2"}`}>{n}</span> : null}
                </button>
              );
            })}
          </div>
          <input
            type="search"
            aria-label="Search by name, email, city or company"
            placeholder="Search name, email, city, company…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={`${inputClass} max-w-[320px]`}
          />
        </div>

        <div className="mt-3">
          {tab === "founders" ? (
            <Loading state={founders} title="Loading founders">
              {() => <FounderTable rows={(founders.data as FounderRow[]).filter((f) => match(f.name, f.email, f.city, f.building))} />}
            </Loading>
          ) : (
            <Loading state={investors} title="Loading investors">
              {() => <InvestorTable rows={(investors.data as InvestorRow[]).filter((i) => match(i.name, i.email, i.firm, i.sectors.join(" ")))} />}
            </Loading>
          )}
        </div>
      </section>
    </>
  );
}

function Numbers({ s }: { s: DataSummary }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat strong label="All users" value={s.users.total} />
        <Stat label="Founders" value={s.users.founders} />
        <Stat label="Investors" value={s.users.investors} />
        <Stat label="New this week" value={s.users.new_7_days} />
        <Stat label="New in 30 days" value={s.users.new_30_days} />
        <Stat label="Active this week" value={s.users.active_7_days} />
      </div>
      <Section title="Founders">
        <CountGrid counts={s.founders} />
      </Section>
      <Section title="Investors">
        <CountGrid counts={s.investors} />
      </Section>
      <Section title="ID's suggestions">
        <CountGrid counts={s.matching} />
      </Section>
      <Section title="Connections and messages" sub="Counts only. Message text is never shown here.">
        <CountGrid counts={s.connections} />
      </Section>
      <Section title="Cafe">
        <CountGrid counts={s.cafe} />
      </Section>
      <Section title="AI usage">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="AI calls" value={s.ai.calls} />
          <Stat label="Cost so far" value={`$${s.ai.cost_usd.toFixed(2)}`} />
          <Stat label="Tokens" value={s.ai.tokens.toLocaleString()} />
          <Stat label="Failed calls" value={s.ai.failed} />
        </div>
      </Section>
    </>
  );
}

function FounderTable({ rows }: { rows: FounderRow[] }) {
  if (!rows.length) return <Empty>No founders match.</Empty>;
  return (
    <Table head={["Founder", "Contact", "Building", "ID", "Investors", "Connections", "Joined", "Last seen"]}>
      {rows.map((f) => (
        <tr key={f.id} className="hover:bg-sand2/40">
          <td className={td}>
            <Link href={`/admin/data/founders/${f.id}`} className={`font-bold underline decoration-rule underline-offset-2 hover:decoration-ink ${focus}`}>
              {f.name}
            </Link>
            {f.city ? <p className="text-[12.5px] text-ink3">{f.city}</p> : null}
          </td>
          <td className={`${td} text-[13px]`}>
            {f.email ?? <span className="text-ink3">no email</span>}
            {f.phone ? <p className="text-ink3">{f.phone}</p> : null}
          </td>
          <td className={`${td} max-w-[260px]`}>
            <p className="line-clamp-2">{f.building || "—"}</p>
            {f.stage ? <p className="line-clamp-1 text-[12.5px] text-ink3">{f.stage}</p> : null}
          </td>
          <td className={td}>{f.id_built ? <Pill tone="forest">Built</Pill> : <Pill tone="muted">Not yet</Pill>}</td>
          <td className={td}>{f.visible_to_investors ? <Pill tone="tint">Opted in</Pill> : <span className="text-ink3">Off</span>}</td>
          <td className={td}>{f.connections}</td>
          <td className={td}>{dateOnly(f.joined_at)}</td>
          <td className={td}>{dateOnly(f.last_seen_at)}</td>
        </tr>
      ))}
    </Table>
  );
}

function InvestorTable({ rows }: { rows: InvestorRow[] }) {
  if (!rows.length) return <Empty>No investors match.</Empty>;
  return (
    <Table head={["Investor", "Sectors", "Introductions", "Accepted", "Waiting", "Pipeline", "Posted", "Last seen"]}>
      {rows.map((i) => (
        <tr key={i.id} className="hover:bg-sand2/40">
          <td className={td}>
            <Link href={`/admin/data/investors/${i.id}`} className={`font-bold underline decoration-rule underline-offset-2 hover:decoration-ink ${focus}`}>
              {i.name}
            </Link>
            <p className="text-[12.5px] text-ink3">{i.firm || "—"}</p>
          </td>
          <td className={`${td} max-w-[220px]`}>{i.has_thesis ? i.sectors.join(", ") : <span className="text-ink3">No thesis yet</span>}</td>
          <td className={td}>{i.introductions}</td>
          <td className={td}>{i.accepted}</td>
          <td className={td}>{i.waiting}</td>
          <td className={td}>{i.in_pipeline}</td>
          <td className={td}>{i.opportunities}</td>
          <td className={td}>{dateOnly(i.last_seen_at)}</td>
        </tr>
      ))}
    </Table>
  );
}

// ── One founder ─────────────────────────────────────────────────────────

function Founder({ client, onAuthLost, id }: { client: AdminApi; onAuthLost: (m: string) => void; id: string }) {
  const state = useAdminLoad(client, (c) => c.dataFounder(id), `founder-${id}`, onAuthLost);
  return (
    <>
      <Back />
      <Loading state={state} title="Loading this founder">
        {() => <FounderView f={state.data as FounderDetail} />}
      </Loading>
    </>
  );
}

function FounderView({ f }: { f: FounderDetail }) {
  const p = f.profile;
  return (
    <>
      <Card className="!bg-espresso !text-cream">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ember-light">Founder</p>
        <h2 className="mt-1 text-[26px] font-extrabold tracking-[-0.02em]">{p.name}</h2>
        {f.headline ? <p className="mt-1.5 max-w-[70ch] text-[15px] italic text-cream/85">{f.headline}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {f.privacy.visible_to_investors ? <Pill tone="ember">Visible to investors</Pill> : <Pill tone="muted">Hidden from investors</Pill>}
          {f.privacy.allow_introductions ? null : <Pill tone="muted">Introductions paused</Pill>}
        </div>
      </Card>

      <Section title="Profile and contact">
        <Card>
          <KV
            rows={[
              ["Email", p.email],
              ["Phone", p.phone],
              ["City", [p.city, p.country].filter(Boolean).join(", ")],
              ["Company", p.organisation],
              ["Role", p.role_title],
              ["LinkedIn", p.linkedin_url],
              ["One line", p.one_line],
              ["Onboarding", p.onboarding_stage],
              ["Joined", whenLabel(p.joined_at)],
              ["Last seen", whenLabel(p.last_seen_at)],
            ]}
          />
        </Card>
      </Section>

      <Section title="What they told us" sub="Their own words from the opening questions.">
        {f.told_us.length ? (
          <Card>
            <KV rows={f.told_us.map((a) => [human(a.question), a.answer])} />
          </Card>
        ) : (
          <Empty>No answers yet.</Empty>
        )}
      </Section>

      <Section title="Their situation now" sub="Declared State: project, stage, goal, needs and what they offer.">
        {f.state.length ? (
          <Table head={["Field", "Value", "Facet", "Confidence", "Source"]}>
            {f.state.map((s, i) => (
              <tr key={i}>
                <td className={`${td} font-bold`}>{human(s.field)}</td>
                <td className={td}>{s.value}</td>
                <td className={td}>{s.facet}</td>
                <td className={td}>{s.confidence}</td>
                <td className={td}>{s.source}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty>Nothing recorded yet.</Empty>
        )}
      </Section>

      <Section title="How ID reads them" sub="Inferred from their choices, strongest first.">
        {f.reads.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {f.reads.map((r, i) => (
              <Card key={i}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink3">{human(r.dimension)}</p>
                  <Pill tone="muted">
                    {r.confidence} · {Math.round(r.strength * 100)}%
                  </Pill>
                </div>
                <p className="inferred mt-1.5 text-[15px]">{r.insight}</p>
                {r.evidence ? <p className="mt-1.5 text-[12.5px] text-ink3">Evidence: {r.evidence}</p> : null}
              </Card>
            ))}
          </div>
        ) : (
          <Empty>Their ID isn&rsquo;t built yet.</Empty>
        )}
      </Section>

      <Section title="Situations they answered">
        {f.situations.length ? (
          <div className="flex flex-col gap-2">
            {f.situations.map((s, i) => (
              <Card key={i}>
                <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink3">
                  {i + 1} · probing {human(s.probing)}
                </p>
                <p className="mt-1 text-[14px] text-ink2">{s.situation}</p>
                <p className="mt-1.5 text-[14.5px] font-bold">{s.question}</p>
                <p className="mt-1 text-[14.5px]">Chose: {s.chose}</p>
                {s.why ? <p className="mt-0.5 text-[14px] text-ink2">Why: {s.why}</p> : null}
              </Card>
            ))}
          </div>
        ) : (
          <Empty>None yet.</Empty>
        )}
      </Section>

      <Section title="What we don't know yet">
        {f.gaps.length ? (
          <Card>
            <ul className="flex flex-col gap-1.5 text-[14px]">
              {f.gaps.map((g, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>{g.question}</span>
                  <Pill tone={g.status === "closed" ? "muted" : "tint"}>{g.status}</Pill>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Empty>No open questions.</Empty>
        )}
      </Section>

      <Section title="District rooms" sub="Who each room is open to.">
        {f.rooms.length ? (
          <div className="flex flex-wrap gap-2">
            {f.rooms.map((r) => (
              <Card key={r.room} className="!p-3">
                <p className="font-bold">{human(r.room)}</p>
                <p className="text-[13px] text-ink3">
                  {human(r.audience)}
                  {r.to_investors ? " · investors" : ""}
                </p>
              </Card>
            ))}
          </div>
        ) : (
          <Empty>Default settings.</Empty>
        )}
      </Section>

      <Section title="Journey and experiments">
        {f.journey.length || f.experiments.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {f.journey.map((j, i) => (
              <Card key={`j${i}`}>
                <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink3">
                  {human(j.kind)} · {j.on}
                </p>
                <p className="mt-1 font-bold">{j.title}</p>
                {j.learned ? <p className="mt-0.5 text-[14px] text-ink2">{j.learned}</p> : null}
              </Card>
            ))}
            {f.experiments.map((e, i) => (
              <Card key={`e${i}`}>
                <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink3">Experiment · {e.status}</p>
                <p className="mt-1 font-bold">{e.title}</p>
                <p className="mt-0.5 text-[14px] text-ink2">{[e.tried, e.happened, e.learned].filter(Boolean).join(" → ")}</p>
              </Card>
            ))}
          </div>
        ) : (
          <Empty>Nothing added yet.</Empty>
        )}
      </Section>

      <Section title="ID's suggestions">
        {f.suggestions.length ? (
          <Table head={["With", "For", "Type", "Status", "Confidence", "Why them"]}>
            {f.suggestions.map((s, i) => (
              <tr key={i}>
                <td className={td}>
                  <Who p={s.with} />
                </td>
                <td className={td}>{s.direction}</td>
                <td className={td}>{s.type}</td>
                <td className={td}>{s.status}</td>
                <td className={td}>{s.confidence}</td>
                <td className={`${td} max-w-[320px] text-ink2`}>{s.why_them}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty>No suggestions yet.</Empty>
        )}
      </Section>

      <Section title="Connection requests">
        <Connections rows={f.connections} />
      </Section>

      <Section title="Conversations" sub="Who they talk to and how much. Never what was written.">
        <Conversations rows={f.conversations} />
      </Section>

      {f.investor_pipelines.length ? (
        <Section title="In investors' pipelines">
          <div className="flex flex-wrap gap-2">
            {f.investor_pipelines.map((x, i) => (
              <Card key={i} className="!p-3">
                <Who p={x.investor} />
                <p className="text-[13px] text-ink3">{human(x.stage)}</p>
              </Card>
            ))}
          </div>
        </Section>
      ) : null}

      <Section title="Activity">
        <CountGrid counts={{ ...f.activity, ai_calls: f.ai.calls }} />
        <p className="mt-2 text-[13px] text-ink3">AI cost for this founder so far: ${f.ai.cost_usd.toFixed(4)}</p>
      </Section>

      <Section title="Recent events">
        <Events rows={f.recent_events} />
      </Section>
    </>
  );
}

// ── One investor ────────────────────────────────────────────────────────

function Investor({ client, onAuthLost, id }: { client: AdminApi; onAuthLost: (m: string) => void; id: string }) {
  const state = useAdminLoad(client, (c) => c.dataInvestor(id), `investor-${id}`, onAuthLost);
  return (
    <>
      <Back />
      <Loading state={state} title="Loading this investor">
        {() => <InvestorView v={state.data as InvestorDetail} />}
      </Loading>
    </>
  );
}

function InvestorView({ v }: { v: InvestorDetail }) {
  const p = v.profile;
  const t = v.thesis;
  return (
    <>
      <Card className="!bg-espresso !text-cream">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ember-light">Investor</p>
        <h2 className="mt-1 text-[26px] font-extrabold tracking-[-0.02em]">{p.name}</h2>
        <p className="mt-1 text-[15px] text-cream/85">{t?.firm || p.organisation}</p>
      </Card>

      <Section title="Profile and contact">
        <Card>
          <KV
            rows={[
              ["Email", p.email],
              ["Phone", p.phone],
              ["City", p.city],
              ["About", p.one_line],
              ["LinkedIn", p.linkedin_url],
              ["Joined", whenLabel(p.joined_at)],
              ["Last seen", whenLabel(p.last_seen_at)],
            ]}
          />
        </Card>
      </Section>

      <Section title="Thesis">
        {t && t.sectors.length ? (
          <Card>
            <KV
              rows={[
                ["Sectors", t.sectors.join(", ")],
                ["Stages", t.stages.join(", ")],
                ["Cheque size", t.cheque],
                ["Geography", t.geography],
              ]}
            />
          </Card>
        ) : (
          <Empty>No thesis saved yet.</Empty>
        )}
      </Section>

      <Section title="Introductions received">
        <Connections rows={v.introductions} />
      </Section>

      <Section title="Pipeline" sub="Their private notes are shown here; founders never see them.">
        {v.pipeline.length ? (
          <Table head={["Founder", "Stage", "Note"]}>
            {v.pipeline.map((x, i) => (
              <tr key={i}>
                <td className={td}>
                  <Who p={x.founder} />
                </td>
                <td className={td}>{human(x.stage)}</td>
                <td className={`${td} text-ink2`}>{x.note || "—"}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty>No founders in their pipeline yet.</Empty>
        )}
      </Section>

      <Section title="Opportunities they posted">
        {v.opportunities.length ? (
          <Table head={["Title", "Kind", "Interested", "Saved", "Posted", "Status"]}>
            {v.opportunities.map((o) => (
              <tr key={o.id}>
                <td className={`${td} font-bold`}>{o.title}</td>
                <td className={td}>{human(o.kind)}</td>
                <td className={td}>{o.interested}</td>
                <td className={td}>{o.saved}</td>
                <td className={td}>{dateOnly(o.posted_at)}</td>
                <td className={td}>{o.archived ? "Archived" : "Live"}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty>None yet.</Empty>
        )}
      </Section>

      <Section title="Conversations" sub="Who they talk to and how much. Never what was written.">
        <Conversations rows={v.conversations} />
      </Section>

      <Section title="Recent events">
        <Events rows={v.recent_events} />
      </Section>
    </>
  );
}

// ── Pages ───────────────────────────────────────────────────────────────

export function DataOverviewPage() {
  return <Frame>{(client, onAuthLost) => <Overview client={client} onAuthLost={onAuthLost} />}</Frame>;
}

export function FounderDataPage({ id }: { id: string }) {
  return <Frame>{(client, onAuthLost) => <Founder client={client} onAuthLost={onAuthLost} id={id} />}</Frame>;
}

export function InvestorDataPage({ id }: { id: string }) {
  return <Frame>{(client, onAuthLost) => <Investor client={client} onAuthLost={onAuthLost} id={id} />}</Frame>;
}
