/* Shapes returned by services/api. Keep in step with app/schemas in the API. */

export type Health = {
  status: "ok";
  database: string;
  ai_provider: string;
};

export type ApiErrorBody = { error?: string; detail?: string | unknown[] };

export type Confidence = "low" | "medium" | "high";
export type Facet = "primary" | "secondary";
export type Source = "declared" | "observed" | "inferred" | "validated";

// ── Founder ─────────────────────────────────────────────────────────────
export type Founder = { id: string; name: string };

// ── Discovery ───────────────────────────────────────────────────────────
export type ContextAnswers = {
  founder_id: string;
  working_on: string;
  hoping_for: string;
  in_the_way: string;
};

export type KnownItem = { dimension: string; text: string; source: Source };
export type UnknownItem = { dimension: string; label: string };
export type KnownUnknown = { known: KnownItem[]; unknown: UnknownItem[] };

export type SituationOption = { id: string; text: string };

export type SituationView = {
  session_id: string;
  situation_id: string;
  sequence_no: number; // 1-based
  total: number; // situations in this session (configured, currently 5)
  dimension: string; // the gap this situation targets, e.g. "Decision making"
  why_asking: string; // the "Why we're asking this" panel
  consequence: string | null; // what the previous choice led to; null for the first
  situation: string;
  question: string;
  options: SituationOption[]; // A–E; E is "Something else."
};

export type ChoiceInput = {
  founder_id: string;
  option_id: string;
  why?: string;
  response_time_ms?: number;
};

export type SignalView = {
  text: string; // what we observed — render as inferred (serif italic)
  evidence: string; // e.g. "Chose B in situation 1"
  type: "observed";
  confidence: number; // 0..1, deliberately low (0.35) for one decision
};

export type ChoiceResult = {
  signal: SignalView;
  done: boolean; // true after the last situation
  remaining_unknowns: UnknownItem[];
};

// ── The ID ──────────────────────────────────────────────────────────────
export type StateItem = { field: string; value: string; confidence: Confidence; facet: Facet; source: Source };

export type PersonAttribute = {
  dimension: string;
  insight: string; // inferred — serif italic
  confidence: Confidence;
  strength: number; // 0..1, drives the bar
  evidence: string; // e.g. "4 of 5 decisions" or "Never tested"
  facet: Facet;
};

export type Gap = { dimension: string; question: string; why_it_matters: string; status: "open" | "probing" | "closed" };

export type RingsTrue = "yes" | "partly" | "no";

export type FounderID = {
  founder: Founder;
  decisions: number; // situations answered
  built_at: string | null; // ISO time of the last build; null = not built yet
  headline: string; // one-line inferred summary of how they operate
  state: StateItem[];
  person: PersonAttribute[];
  gaps: Gap[];
  overall_confidence: "developing" | "established";
  rings_true: RingsTrue | null; // the founder's latest answer to "Does this ring true?"
};

export type TellMeMoreInput = { founder_id: string; text: string };

// ── Recommendations ─────────────────────────────────────────────────────
export type MatchPerson = { name: string; building: string; stage: string; city: string };

export type Recommendation =
  | {
      kind: "match";
      id: string;
      person: MatchPerson;
      match_type: string; // e.g. "NEED → CAPABILITY"
      why_now: string;
      why_them: string;
      what_could_happen: string;
      confidence: Confidence;
      confidence_reason: string;
    }
  | {
      kind: "none";
      reasons: string[]; // honest "why not" lines, never revealing other members' private state
    };

export type RecommendationResponse = { founder_id: string; response: "accept" | "decline" };
// Accepting an introduction opens a conversation between the two founders.
export type RespondResult = { ok: true; conversation_id: string | null };

// ── Privacy (consent as data; investor visibility is opt-in) ────────────
export type Privacy = {
  id_visible_to_investors: boolean;
  state_visible_to_investors: boolean;
  allow_introductions: boolean;
};

// ── Messaging (opened only by an accepted introduction) ─────────────────
export type ChatMessage = { id: string; from_me: boolean; body: string; sent_at: string };

export type ConversationSummary = {
  id: string;
  with: MatchPerson;
  origin: string; // why they were introduced — pinned at the top of the thread
  last_message: string | null;
  last_message_at: string | null;
  unread: number;
};

export type Conversation = {
  id: string;
  with: MatchPerson;
  origin: string;
  introduced_at: string;
  messages: ChatMessage[];
};

// ── Outcomes ("Did that go anywhere?", asked a while after an introduction) ──
export type PendingOutcome = { recommendation_id: string; with: MatchPerson; introduced_at: string };

export type OutcomeInput = {
  founder_id: string;
  did_meet: boolean;
  was_useful: "not_really" | "yes" | "very" | null; // null when they didn't meet
  will_talk_again: "already" | "maybe" | "no" | null;
};

export type OutcomeResult = {
  validated: boolean; // true when this outcome became VALIDATED evidence on the ID
  what_changed: string; // shown as inferred text
};
