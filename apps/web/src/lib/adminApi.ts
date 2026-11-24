import { ApiError, type AdminCafe, type ApiErrorBody, type CafeTableStatus, type WhatsOnKind } from "@idea-district/api-client";

/*
 * The team's admin console client. Separate from `api` because every call carries
 * the X-Admin-Token header instead of a founder session.
 */

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export type NewBrew = { question: string; publish_on?: string; drafted_by_ai?: boolean };
export type NewTable = { title: string; prompt: string; starts_at?: string };
export type NewWhatsOn = { kind: WhatsOnKind; title: string; detail?: string; starts_at?: string; place?: string };
export type ModerateInput = { kind: "answer" | "post"; id: string; hidden: boolean };

/** An Explore industries read, as the console lists it. */
export type TopicCategory = "market" | "business_model";
export type AdminTopic = {
  slug: string;
  title: string;
  category: TopicCategory;
  minutes: number;
  tags: string;
  archived: boolean;
  created_at: string;
};
export type TopicSection = { heading: string; body: string };
export type NewTopic = {
  title: string;
  category: TopicCategory;
  minutes?: number;
  summary: string;
  sections: TopicSection[];
  questions?: string[];
  /** Comma-separated keywords. */
  tags?: string;
};

/** An opportunity the team posted, as the console lists it. */
export type OpportunityKindAdmin = "pilot_call" | "challenge" | "problem" | "circle";
export type AdminOpportunity = {
  id: string;
  kind: OpportunityKindAdmin;
  title: string;
  posted_by: string;
  summary: string;
  closes_on: string | null;
  archived: boolean;
  tags: string;
  interested: { name: string; note: string | null; at: string | null }[];
};
export type NewOpportunity = {
  kind: OpportunityKindAdmin;
  title: string;
  posted_by: string;
  summary: string;
  what_they_need?: string;
  timeline?: string;
  how_to_respond?: string;
  /** Comma-separated keywords. */
  tags?: string;
  /** YYYY-MM-DD */
  closes_on?: string;
};

/** Plain-English names for the fields FastAPI names in a 422. */
const FIELD_NAMES: Record<string, string> = {
  question: "Question",
  publish_on: "Date",
  drafted_by_ai: "AI draft flag",
  count: "How many",
  theme: "Theme",
  title: "Title",
  prompt: "Pinned prompt",
  starts_at: "Start",
  status: "Status",
  kind: "Kind",
  detail: "Detail",
  place: "Place",
  id: "Item",
  hidden: "Hidden",
  category: "Category",
  minutes: "Minutes",
  summary: "Summary",
  sections: "Sections",
  heading: "Section heading",
  body: "Section body",
  questions: "Questions",
  tags: "Tags",
  posted_by: "Posted by",
  what_they_need: "What they need",
  timeline: "Timeline",
  how_to_respond: "How to respond",
  closes_on: "Closing date",
};

type ValidationIssue = { loc?: unknown[]; msg?: unknown };

function validationMessage(detail: unknown[]): string | null {
  const lines = detail
    .map((raw) => {
      const issue = raw as ValidationIssue;
      if (typeof issue?.msg !== "string") return null;
      const field = Array.isArray(issue.loc) ? issue.loc[issue.loc.length - 1] : undefined;
      const name = typeof field === "string" ? (FIELD_NAMES[field] ?? field) : null;
      // "String should have at least 8 characters" → "Question should have at least 8 characters"
      const msg = issue.msg.replace(/^(String|Input|Value)\s+/, "");
      return name ? `${name} ${msg.charAt(0).toLowerCase()}${msg.slice(1)}.` : `${issue.msg}.`;
    })
    .filter((l): l is string => Boolean(l));
  return lines.length ? lines.join(" ") : null;
}

function readable(status: number, body: ApiErrorBody | null): string {
  const detail = body?.detail as unknown;
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail)) {
    const msg = validationMessage(detail);
    if (msg) return msg;
  }
  if (typeof body?.error === "string" && body.error) return body.error;
  if (status === 401) return "That admin token isn't right.";
  if (status === 422) return "Some of the details sent weren't valid.";
  return `The request failed (${status}).`;
}

/** An ApiError whose message is always a sentence a person can act on. */
export class AdminApiError extends ApiError {
  constructor(status: number, body: ApiErrorBody | null) {
    super(status, body);
    this.name = "AdminApiError";
    this.message = readable(status, body);
  }
}

/** True when the token was rejected: the console should sign out and ask again. */
/* ── Users & data (the team's view of everyone; never message text) ── */

export type Counts = Record<string, number>;
export type DataSummary = {
  users: Counts;
  founders: Counts;
  investors: Counts;
  matching: Counts;
  connections: Counts;
  cafe: Counts;
  ai: { calls: number; cost_usd: number; tokens: number; failed: number };
};
export type PersonRef = { id: string; name: string; type: string; organisation: string } | null;
export type FounderRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string;
  building: string;
  stage: string;
  id_built: boolean;
  visible_to_investors: boolean;
  connections: number;
  joined_at: string;
  last_seen_at: string | null;
};
export type ConnectionRow = {
  id: string;
  direction: "sent" | "received";
  with: PersonRef;
  status: string;
  origin: string;
  note: string;
  sent_at: string;
  answered_at: string | null;
};
export type ConversationRow = {
  id: string;
  with: PersonRef[];
  messages: number;
  sent_by_them: number;
  started_at: string | null;
  last_message_at: string | null;
};
export type EventRow = { event: string; at: string };
export type FounderDetail = {
  profile: Record<string, string | null>;
  privacy: { visible_to_investors: boolean; allow_introductions: boolean };
  rooms: { room: string; audience: string; to_investors: boolean }[];
  headline: string;
  told_us: { question: string; answer: string; choice: string | null; at: string | null }[];
  situations: { situation: string; question: string; probing: string; chose: string; why: string | null }[];
  state: { field: string; facet: string; value: string; confidence: string; source: string }[];
  reads: { dimension: string; facet: string; insight: string; confidence: string; strength: number; evidence: string }[];
  gaps: { dimension: string; question: string; status: string }[];
  journey: { kind: string; title: string; on: string; learned: string }[];
  experiments: { title: string; status: string; tried: string; happened: string; learned: string }[];
  suggestions: { with: PersonRef; direction: string; type: string; status: string; confidence: string; why_them: string; at: string }[];
  connections: ConnectionRow[];
  conversations: ConversationRow[];
  investor_pipelines: { investor: PersonRef; stage: string }[];
  activity: Counts;
  ai: DataSummary["ai"];
  recent_events: EventRow[];
};
export type InvestorRow = {
  id: string;
  name: string;
  firm: string;
  email: string | null;
  sectors: string[];
  has_thesis: boolean;
  introductions: number;
  accepted: number;
  waiting: number;
  in_pipeline: number;
  opportunities: number;
  joined_at: string;
  last_seen_at: string | null;
};
export type InvestorDetail = {
  profile: Record<string, string | null>;
  thesis: { firm: string; sectors: string[]; stages: string[]; cheque: string; geography: string } | null;
  introductions: ConnectionRow[];
  pipeline: { founder: PersonRef; stage: string; note: string }[];
  opportunities: { id: string; kind: string; title: string; archived: boolean; posted_at: string; interested: number; saved: number }[];
  conversations: ConversationRow[];
  recent_events: EventRow[];
};

export function isAuthError(e: unknown): boolean {
  return e instanceof ApiError && e.status === 401;
}

/** A readable message for anything thrown by the admin client. */
export function adminErrorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something unexpected happened.";
}

export function createAdminApi(token: string) {
  /** `path` is relative to /v1/admin. */
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${BASE}/v1/admin${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", "X-Admin-Token": token, ...init.headers },
      });
    } catch {
      throw new Error(`We couldn't reach the Idea District API at ${BASE}. Check it is running, then try again.`);
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
      throw new AdminApiError(res.status, body);
    }
    return (await res.json()) as T;
  }

  const post = <T>(path: string, body: unknown) => request<T>(`/cafe${path}`, { method: "POST", body: JSON.stringify(body) });
  const del = <T>(path: string) => request<T>(`/cafe${path}`, { method: "DELETE" });
  const id = encodeURIComponent;

  return {
    overview: () => request<AdminCafe>("/cafe"),

    addBrew: (input: NewBrew) => post<{ id: string; publish_on: string }>("/brews", input),
    deleteBrew: (brewId: string) => del<{ ok: true }>(`/brews/${id(brewId)}`),
    draftBrews: (count: number, theme?: string) =>
      post<{ questions: string[] }>("/brews/draft", theme ? { count, theme } : { count }),

    addTable: (input: NewTable) => post<{ id: string; status: CafeTableStatus }>("/tables", input),
    setTableStatus: (tableId: string, status: CafeTableStatus) =>
      post<{ ok: true }>(`/tables/${id(tableId)}/status`, { status }),

    addWhatsOn: (input: NewWhatsOn) => post<{ id: string }>("/whats-on", input),
    archiveWhatsOn: (itemId: string) => del<{ ok: true }>(`/whats-on/${id(itemId)}`),

    moderate: (input: ModerateInput) => post<{ ok: true }>("/moderate", input),

    listTopics: () => request<AdminTopic[]>("/topics"),
    addTopic: (input: NewTopic) => request<{ slug: string }>("/topics", { method: "POST", body: JSON.stringify(input) }),
    archiveTopic: (slug: string) => request<{ ok: true }>(`/topics/${id(slug)}`, { method: "DELETE" }),

    listOpportunities: () => request<AdminOpportunity[]>("/opportunities"),
    addOpportunity: (input: NewOpportunity) =>
      request<{ id: string }>("/opportunities", { method: "POST", body: JSON.stringify(input) }),
    archiveOpportunity: (oppId: string) => request<{ ok: true }>(`/opportunities/${id(oppId)}`, { method: "DELETE" }),

    dataSummary: () => request<DataSummary>("/data/summary"),
    dataFounders: () => request<FounderRow[]>("/data/founders"),
    dataFounder: (founderId: string) => request<FounderDetail>(`/data/founders/${id(founderId)}`),
    dataInvestors: () => request<InvestorRow[]>("/data/investors"),
    dataInvestor: (investorId: string) => request<InvestorDetail>(`/data/investors/${id(investorId)}`),
  };
}

export type AdminApi = ReturnType<typeof createAdminApi>;
