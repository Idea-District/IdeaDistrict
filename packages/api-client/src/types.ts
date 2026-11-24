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
export type UnknownItem = {
  id: string; // tap it to explore with one optional situation (api.probeGap)
  dimension: string;
  label: string;
  why_it_matters: string;
};
export type KnownUnknown = { known: KnownItem[]; unknown: UnknownItem[] };

export type SituationOption = { id: string; text: string };

export type SituationView = {
  kind: "discovery" | "probe"; // probe = one optional situation on a topic the founder tapped
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
  text: string; // what this choice MIGHT suggest — render as inferred (serif italic)
  still_unclear: string; // what this one choice can't tell us yet
  decisions_so_far: number;
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

export type Gap = { id: string; dimension: string; question: string; why_it_matters: string; status: "open" | "probing" | "closed" };

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
export type MatchPerson = {
  name: string;
  building: string;
  stage: string;
  city: string;
  role: "founder" | "investor"; // investors are only ever suggested as funding introductions
};

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
export type RespondResult = {
  ok: true;
  conversation_id: string | null; // set only once both people have agreed
  request_id: string | null;
  waiting_for_them: boolean;
};

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

// ── Ask ID ──────────────────────────────────────────────────────────────
export type AskTurn = { role: "founder" | "id"; text: string };
export type AskInput = { founder_id: string; message: string; history: AskTurn[] };
export type AskReply = { reply: string; rests_on: string; strength: Confidence; suggestions: string[] };

// ── The District Cafe ───────────────────────────────────────────────────
export type CafePerson = { id: string; name: string; building: string };
export type Brew = {
  id: string;
  question: string;
  publish_on: string;
  answer_count: number;
  my_answer: { body: string; save_to_journey: boolean } | null;
};
export type BrewAnswer = {
  id: string;
  body: string;
  author: CafePerson;
  mine: boolean;
  helpful_count: number;
  helpful_by_me: boolean;
  posted_at: string;
};
export type CafeTableStatus = "open" | "scheduled" | "closed";
export type CafeTable = {
  id: string;
  title: string;
  prompt: string;
  status: CafeTableStatus;
  starts_at: string | null;
  seated_count: number;
  post_count: number;
  joined: boolean;
};
export type TablePost = { id: string; body: string; author: CafePerson; mine: boolean; posted_at: string };
export type CafeTableDetail = CafeTable & { seated: CafePerson[]; posts: TablePost[] };
export type WhatsOnKind = "event" | "open_call" | "table";
export type WhatsOnItem = {
  id: string;
  kind: WhatsOnKind;
  title: string;
  detail: string;
  starts_at: string | null;
  place: string | null;
  table_id: string | null;
  saved: boolean;
};
export type CafeSpot = "counter" | "tables" | "notice" | "quick" | "district";
export type CafeHome = {
  brew: Brew | null;
  tables_open: number;
  next_table: CafeTable | null;
  whats_on: WhatsOnItem[];
  here_today: number;
};

// ── Admin console (the team) ────────────────────────────────────────────
export type AdminBrew = { id: string; question: string; publish_on: string; drafted_by_ai: boolean; answer_count: number };
export type AdminPost = { kind: "answer" | "post"; id: string; body: string; author: string; hidden: boolean; posted_at: string };
export type AdminCafe = {
  today: string;
  brews: AdminBrew[];
  tables: CafeTable[];
  whats_on: WhatsOnItem[];
  recent: AdminPost[];
};

// ── My District rooms ───────────────────────────────────────────────────
export type Room = "journey" | "business" | "needs" | "progress" | "capabilities";
export type Audience = "private" | "connections" | "community";
export type DistrictSpot = Room | "id" | "unknowns" | "lens";
export type DistrictOverview = {
  visibility: Record<Room, Audience>;
  rooms: Record<Room, { count: number; latest: string | null }>;
};
export type JourneyItem = {
  id: string;
  kind: "milestone" | "decision" | "reflection" | "simulation";
  title: string;
  learned: string;
  on: string; // YYYY-MM-DD
  source: "you" | "daily_brew" | "idea_district" | "simulator";
  removable: boolean;
};
export type StateEntry = {
  id: string;
  field: string;
  label: string;
  value: string;
  source: Source;
  facet: Facet;
  updated_at: string;
};
export type BusinessField = "project" | "stage" | "problem" | "constraint" | "trajectory";
export type BusinessRoom = { items: StateEntry[]; fields: { field: BusinessField; label: string }[] };
export type NeedsRoom = { need: StateEntry[]; goal: StateEntry[]; offer: StateEntry[] };
export type ExperimentStatus = "running" | "done" | "stopped";
export type ExperimentItem = {
  id: string;
  title: string;
  tried: string;
  happened: string;
  learned: string;
  status: ExperimentStatus;
  started_on: string;
  ended_on: string | null;
};
export type CapabilityItem = {
  dimension: string;
  insight: string;
  confidence: Confidence;
  evidence: string;
  facet: Facet;
  enough_evidence: boolean;
};
export type VisibilitySettings = { rooms: Record<Room, Audience>; investors: boolean; investor_rooms: Room[] };

// ── Quick Breaks toolkit ────────────────────────────────────────────────
export type SimPath = {
  key: "A" | "B";
  title: string;
  summary: string;
  tradeoffs: { label: string; text: string }[];
  watch_for: string;
};
export type Simulation = {
  id: string;
  assumption: string;
  paths: SimPath[];
  grounded_in: string;
  question: string;
  chosen: "A" | "B" | null;
  reflection: string;
  saved_to_journey: boolean;
  created_at: string;
};
export type TopicCategory = "market" | "business_model";
export type IndustryTopicSummary = {
  slug: string;
  title: string;
  category: TopicCategory;
  minutes: number;
  summary: string;
  for_you: boolean;
};
export type IndustryTopic = IndustryTopicSummary & {
  sections: { heading: string; body: string }[];
  questions: string[];
};

// ── People: Explore, visiting, connections, opportunities ───────────────
export type Relation = "connected" | "request_sent" | "request_received" | "none";
export type SharedItem = { label: string; value: string; confidence?: Confidence };
export type PeopleSpot = "you" | "suggestion" | "person" | "requests" | "harbour";
export type ExplorePick = { id: string; person: MatchPerson; reason: string; shared: Room[] };
export type ExploreResult = { picks: ExplorePick[]; next_picks_on: string };
export type VisitedDistrict = {
  id: string;
  person: MatchPerson;
  relation: Relation;
  shared: Room[];
  private: Room[];
  rooms: Partial<Record<Room, SharedItem[]>>;
};
export type Meet = {
  person: MatchPerson;
  you_may_bring: string;
  they_may_bring: string;
  why_it_may_matter: string;
  confidence: Confidence;
  rests_on: string;
  relation: Relation;
};
export type ConnectionRequestItem = {
  id: string;
  person_id: string;
  person: MatchPerson;
  note: string;
  status: "pending" | "accepted" | "declined" | "withdrawn";
  direction: "sent" | "received";
  sent_at: string;
  origin?: "explore" | "visitor" | "opportunity" | "suggestion";
  conversation_id?: string | null;
};
export type ConnectionItem = { person_id: string; person: MatchPerson; conversation_id: string | null; last_message_at: string | null };
export type Connections = {
  connected: ConnectionItem[];
  in_talks: ConnectionItem[];
  received: ConnectionRequestItem[];
  sent: ConnectionRequestItem[];
};
export type OpportunityKind = "pilot_call" | "challenge" | "problem" | "circle";
export type OpportunitySummary = {
  id: string;
  kind: OpportunityKind;
  title: string;
  posted_by: string;
  summary: string;
  closes_on: string | null;
  saved: boolean;
  interested: boolean;
  for_you: boolean;
};
export type OpportunityDetail = OpportunitySummary & {
  what_they_need: string;
  timeline: string;
  how_to_respond: string;
  fit: { reason: string; confidence: Confidence; rests_on: string } | null;
};

// ── Me ──────────────────────────────────────────────────────────────────
export type AvatarChoice = {
  role: "builder" | "operator" | "seller" | "researcher";
  personality: "calm" | "bold" | "curious";
  style: "line" | "flat" | "paper";
  colour: "persimmon" | "forest" | "dust" | "beige";
};
export type Profile = {
  id: string;
  name: string;
  one_line: string;
  city: string;
  avatar: AvatarChoice | null;
  user_type: "founder" | "investor" | "admin";
  joined_at: string;
};

// ── Investor web app ────────────────────────────────────────────────────
export type PipelineStage = "introduced" | "conversation" | "diligence" | "passed";
export type InvestorAccount = { id: string; name: string; firm: string };
export type InvestorThesis = { name: string; firm: string; sectors: string[]; stages: string[]; cheque: string; geography: string };
export type InvestorIntro = {
  request_id: string;
  founder_id: string;
  person: MatchPerson;
  status: string;
  sent_at: string;
  why: string;
  thesis_fit: string | null;
  shares_rooms: Room[];
};
export type InvestorHome = {
  name: string;
  firm: string;
  introductions: InvestorIntro[];
  pipeline_counts: Record<PipelineStage, number>;
  insight_teaser: InsightTheme[];
  has_thesis: boolean;
};
export type InvestorFounderView = {
  id: string;
  person: MatchPerson;
  opted_in: boolean;
  shared: Room[];
  not_shared: Room[];
  rooms: Partial<Record<Room, SharedItem[]>>;
  relation: Relation;
  thesis_fit: string | null;
  pipeline: { stage: PipelineStage; note: string } | null;
};
export type PipelineCard = { founder_id: string; person: MatchPerson; note: string };
export type Pipeline = Record<PipelineStage, PipelineCard[]>;
export type InsightTheme = { theme: string; founders: "several" | "many" };
export type Insights = {
  founders_in_community: string;
  top_needs: InsightTheme[];
  common_offers: InsightTheme[];
  what_founders_build: InsightTheme[];
  rule: string;
};
export type InvestorOpportunity = {
  id: string;
  kind: OpportunityKind;
  title: string;
  archived: boolean;
  interested: { founder_id: string; name: string; note: string }[];
};
