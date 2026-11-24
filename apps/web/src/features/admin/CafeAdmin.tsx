"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";

import type { AdminCafe } from "@idea-district/api-client";

import { buttonClass, CalmState, ErrorNotice, IdMark, Label } from "@/components/ui";
import { adminErrorMessage, createAdminApi, isAuthError } from "@/lib/adminApi";

import { clearAdminToken, saveAdminToken, useAdminToken } from "./adminToken";
import { BrewSection } from "./BrewSection";
import { ModerationSection } from "./ModerationSection";
import { OpportunitiesSection, useOpportunities } from "./OpportunitiesSection";
import { AdminProvider, Card, dayLabel, Field, focus, inputClass, smallButton } from "./parts";
import { TablesSection } from "./TablesSection";
import { TopicsSection, useTopics } from "./TopicsSection";
import { WhatsOnSection } from "./WhatsOnSection";

type TabId = "brew" | "tables" | "whats-on" | "moderation" | "topics" | "opportunities";

/** The team's console: Cafe content (Daily Brew, Open Tables, What's On, moderation) and Explore industries reads. */
export function CafeAdmin() {
  const token = useAdminToken();
  const [data, setData] = useState<AdminCafe | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gateMessage, setGateMessage] = useState<string | null>(null);

  const client = useMemo(() => (token ? createAdminApi(token) : null), [token]);

  const signOut = useCallback((message: string | null = null) => {
    clearAdminToken();
    setData(null);
    setLoadError(null);
    setGateMessage(message);
  }, []);

  const refresh = useCallback(async () => {
    if (!client) return;
    try {
      const next = await client.overview();
      setData(next);
      setLoadError(null);
    } catch (e) {
      if (isAuthError(e)) signOut(adminErrorMessage(e));
      else setLoadError(adminErrorMessage(e));
    }
  }, [client, signOut]);

  // First load for each token; later changes call refresh() directly.
  useEffect(() => {
    if (!client) return;
    let live = true;
    client.overview().then(
      (next) => {
        if (!live) return;
        setData(next);
        setLoadError(null);
      },
      (e) => {
        if (!live) return;
        if (isAuthError(e)) signOut(adminErrorMessage(e));
        else setLoadError(adminErrorMessage(e));
      },
    );
    return () => {
      live = false;
    };
  }, [client, signOut]);

  const ctx = useMemo(
    () => (client && data ? { client, today: data.today, refresh, onAuthLost: (m: string) => signOut(m) } : null),
    [client, data, refresh, signOut],
  );

  let body: ReactNode;
  if (token === undefined) body = <CalmState title="Opening the admin" />;
  else if (token === null)
    body = (
      <TokenGate
        message={gateMessage}
        onSubmit={(t) => {
          setGateMessage(null);
          saveAdminToken(t);
        }}
      />
    );
  else if (!ctx || !data)
    body = loadError ? (
      <div className="mx-auto mt-6 w-full max-w-[480px]">
        <ErrorNotice message={loadError} onRetry={() => void refresh()} />
      </div>
    ) : (
      <CalmState title="Loading the Cafe" sub="Brews, tables, What's On and recent posts." />
    );
  else
    body = (
      <AdminProvider value={ctx}>
        {loadError ? (
          <div className="mb-4">
            <ErrorNotice message={`Couldn't refresh: ${loadError}`} onRetry={() => void refresh()} />
          </div>
        ) : null}
        <Console data={data} />
      </AdminProvider>
    );

  return (
    <div className="flex min-h-full flex-1 flex-col bg-screen text-ink">
      <div className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col px-4 py-5 sm:px-6 lg:py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
          <div className="flex items-center gap-3">
            <IdMark size={30} />
            <div>
              <h1 className="text-[20px] font-extrabold leading-tight tracking-[-0.02em]">Admin</h1>
              {data ? <p className="text-[13px] text-ink3">Today is {dayLabel(data.today, true)}</p> : null}
            </div>
          </div>
          {token ? (
            <div className="flex gap-2">
              <button type="button" className={smallButton()} onClick={() => void refresh()}>
                Refresh
              </button>
              <button type="button" className={smallButton()} onClick={() => signOut()}>
                Sign out
              </button>
            </div>
          ) : null}
        </header>
        {body}
      </div>
    </div>
  );
}

function TokenGate({ message, onSubmit }: { message: string | null; onSubmit: (token: string) => void }) {
  const [value, setValue] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const t = value.trim();
    if (t) onSubmit(t);
  }

  return (
    <div className="mx-auto mt-4 w-full max-w-[420px] sm:mt-10">
      <Card>
        <Label>Team only</Label>
        <h2 className="mt-1.5 text-[20px] font-bold">Sign in to the admin</h2>
        <p className="mt-1.5 text-[14px] text-ink2">Use the admin token from the API settings. It is kept for this browser tab only.</p>
        <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
          <Field label="Admin token">
            {(p) => (
              <input
                {...p}
                type="password"
                autoComplete="current-password"
                required
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={inputClass}
              />
            )}
          </Field>
          {message ? <ErrorNotice message={message} /> : null}
          <button type="submit" className={buttonClass("primary")} disabled={!value.trim()}>
            Sign in
          </button>
        </form>
      </Card>
    </div>
  );
}

function Console({ data }: { data: AdminCafe }) {
  const [tab, setTab] = useState<TabId>("brew");
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  // Industry reads aren't in the Cafe overview; load them here so the tab count shows straight away.
  const topics = useTopics();
  const opportunities = useOpportunities();

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "brew", label: "Daily Brew", count: data.brews.filter((b) => b.publish_on > data.today).length },
    { id: "tables", label: "Open Tables", count: data.tables.filter((t) => t.status !== "closed").length },
    { id: "whats-on", label: "What's On", count: data.whats_on.length },
    { id: "moderation", label: "Moderation", count: data.recent.length },
    { id: "topics", label: "Industry reads", count: topics.topics ? topics.topics.filter((t) => !t.archived).length : 0 },
    {
      id: "opportunities",
      label: "Opportunities",
      count: opportunities.opportunities ? opportunities.opportunities.filter((o) => !o.archived).length : 0,
    },
  ];

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const i = tabs.findIndex((t) => t.id === tab);
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const id = tabs[(next + tabs.length) % tabs.length]!.id;
    setTab(id);
    refs.current[id]?.focus();
  }

  return (
    <>
      <div role="tablist" aria-label="Admin sections" onKeyDown={onKey} className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const selected = t.id === tab;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(t.id)}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[14px] font-bold transition-colors ${
                selected ? "bg-espresso text-cream" : "border border-rule bg-card text-ink hover:bg-sand2"
              } ${focus}`}
            >
              {t.label}
              <span className={`rounded-full px-1.5 py-[1px] text-[11.5px] ${selected ? "bg-cream/15 text-cream" : "bg-sand2 text-ink2"}`}>{t.count}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "brew" ? <BrewSection brews={data.brews} /> : null}
        {tab === "tables" ? <TablesSection tables={data.tables} /> : null}
        {tab === "whats-on" ? <WhatsOnSection items={data.whats_on} /> : null}
        {tab === "moderation" ? <ModerationSection recent={data.recent} /> : null}
        {tab === "topics" ? <TopicsSection state={topics} /> : null}
        {tab === "opportunities" ? <OpportunitiesSection state={opportunities} /> : null}
      </div>
    </>
  );
}
