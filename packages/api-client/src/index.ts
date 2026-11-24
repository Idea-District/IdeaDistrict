import type {
  ApiErrorBody,
  AskInput,
  AskReply,
  AvatarChoice,
  Audience,
  BusinessField,
  BusinessRoom,
  CapabilityItem,
  DistrictOverview,
  DistrictSpot,
  ExperimentItem,
  ExperimentStatus,
  JourneyItem,
  NeedsRoom,
  Room,
  VisibilitySettings,
  Brew,
  BrewAnswer,
  CafeHome,
  CafeSpot,
  CafeTable,
  CafeTableDetail,
  ChatMessage,
  ChoiceInput,
  ChoiceResult,
  ConnectionRequestItem,
  Connections,
  ContextAnswers,
  Conversation,
  ConversationSummary,
  Founder,
  FounderID,
  IndustryTopic,
  IndustryTopicSummary,
  Health,
  Insights,
  InvestorAccount,
  InvestorFounderView,
  InvestorHome,
  InvestorIntro,
  InvestorOpportunity,
  InvestorThesis,
  ExploreResult,
  KnownUnknown,
  Meet,
  OpportunityDetail,
  OpportunitySummary,
  PeopleSpot,
  OpportunityKind,
  OutcomeInput,
  OutcomeResult,
  PendingOutcome,
  Pipeline,
  PipelineStage,
  Privacy,
  Profile,
  Recommendation,
  RecommendationResponse,
  RespondResult,
  RingsTrue,
  Simulation,
  SituationView,
  TellMeMoreInput,
  VisitedDistrict,
  WhatsOnItem,
} from "./types";

export * from "./types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody | null,
  ) {
    // FastAPI validation errors put a list in `detail`; only use it when it's a sentence.
    const detail = typeof body?.detail === "string" ? body.detail : undefined;
    super(detail ?? (status === 422 ? "Some of the details sent weren't valid." : body?.error) ?? `API request failed with ${status}`);
  }
}

/** One client for web and mobile. Pass the API base URL, e.g. http://localhost:8000. */
export function createApiClient(baseUrl: string, getToken?: () => string | null) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = getToken?.();
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/v1${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
      throw new ApiError(res.status, body);
    }
    return (await res.json()) as T;
  }

  const post = <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) });
  const q = (founderId: string) => `?founder_id=${encodeURIComponent(founderId)}`;

  return {
    health: () => request<Health>("/health"),

    // Founder (no auth in the demo: the web app keeps the id)
    createFounder: (name: string) => post<Founder>("/founders", { name }),

    // Discovery
    saveContext: (answers: ContextAnswers) => post<KnownUnknown>("/discovery/context", answers),
    knownUnknown: (founderId: string) => request<KnownUnknown>(`/discovery/known${q(founderId)}`),
    startSession: (founderId: string) => post<SituationView>("/discovery/sessions", { founder_id: founderId }),
    currentSituation: (sessionId: string) => request<SituationView>(`/discovery/sessions/${sessionId}/current`),
    choose: (situationId: string, input: ChoiceInput) =>
      post<ChoiceResult>(`/discovery/situations/${situationId}/choice`, input),
    nextSituation: (sessionId: string) => post<SituationView>(`/discovery/sessions/${sessionId}/next`, {}),
    /** One optional situation on a topic from "What we don't know yet". Returns a single-situation session. */
    probeGap: (gapId: string, founderId: string) =>
      post<SituationView>(`/discovery/gaps/${gapId}/probe`, { founder_id: founderId }),

    // The ID
    buildId: (founderId: string) => post<FounderID>("/id/build", { founder_id: founderId }),
    getId: (founderId: string) => request<FounderID>(`/id${q(founderId)}`),
    tellMeMore: (input: TellMeMoreInput) => post<FounderID>("/id/tell-me-more", input),
    ringsTrue: (founderId: string, answer: RingsTrue) =>
      post<{ ok: true }>("/id/rings-true", { founder_id: founderId, answer }),

    // Privacy
    privacy: (founderId: string) => request<Privacy>(`/privacy${q(founderId)}`),
    updatePrivacy: (founderId: string, changes: Partial<Privacy>) =>
      post<Privacy>("/privacy", { founder_id: founderId, ...changes }),

    // Recommendations
    recommendation: (founderId: string) => request<Recommendation>(`/recommendations${q(founderId)}`),
    respond: (recommendationId: string, input: RecommendationResponse) =>
      post<RespondResult>(`/recommendations/${recommendationId}/respond`, input),

    // Messaging
    pierVisit: (founderId: string, spot: "lantern" | "letterbox") => post<{ ok: boolean }>("/conversations/visit", { founder_id: founderId, spot }),
    conversations: (founderId: string) => request<ConversationSummary[]>(`/conversations${q(founderId)}`),
    conversation: (conversationId: string, founderId: string) =>
      request<Conversation>(`/conversations/${conversationId}${q(founderId)}`),
    sendMessage: (conversationId: string, founderId: string, body: string) =>
      post<ChatMessage>(`/conversations/${conversationId}/messages`, { founder_id: founderId, body }),

    // Outcomes
    pendingOutcomes: (founderId: string) => request<PendingOutcome[]>(`/outcomes/pending${q(founderId)}`),
    reportOutcome: (recommendationId: string, input: OutcomeInput) =>
      post<OutcomeResult>(`/recommendations/${recommendationId}/outcome`, input),

    // Ask ID: talk a decision through, using only what is in the founder's District.
    askId: (input: AskInput) => post<AskReply>("/ask", input),

    // The District Cafe
    cafeHome: (founderId: string) => request<CafeHome>(`/cafe?founder_id=${founderId}`),
    cafeVisit: (founderId: string, spot: CafeSpot) => post<{ ok: boolean }>("/cafe/visit", { founder_id: founderId, spot }),
    todaysBrew: (founderId: string) => request<{ brew: Brew | null }>(`/cafe/brew?founder_id=${founderId}`),
    answerBrew: (brewId: string, input: { founder_id: string; body: string; save_to_journey: boolean }) =>
      post<Brew>(`/cafe/brews/${brewId}/answer`, input),
    brewAnswers: (brewId: string, founderId: string) =>
      request<BrewAnswer[]>(`/cafe/brews/${brewId}/answers?founder_id=${founderId}`),
    markHelpful: (answerId: string, founderId: string, on: boolean) =>
      post<{ helpful_count: number; helpful_by_me: boolean }>(`/cafe/answers/${answerId}/helpful`, { founder_id: founderId, on }),
    cafeTables: (founderId: string) => request<CafeTable[]>(`/cafe/tables?founder_id=${founderId}`),
    cafeTable: (tableId: string, founderId: string) => request<CafeTableDetail>(`/cafe/tables/${tableId}?founder_id=${founderId}`),
    joinTable: (tableId: string, founderId: string) => post<CafeTableDetail>(`/cafe/tables/${tableId}/join`, { founder_id: founderId }),
    leaveTable: (tableId: string, founderId: string) => post<CafeTable>(`/cafe/tables/${tableId}/leave`, { founder_id: founderId }),
    postToTable: (tableId: string, founderId: string, body: string) =>
      post<CafeTableDetail>(`/cafe/tables/${tableId}/posts`, { founder_id: founderId, body }),
    whatsOn: (founderId: string) => request<WhatsOnItem[]>(`/cafe/whats-on?founder_id=${founderId}`),
    saveWhatsOn: (itemId: string, founderId: string, on: boolean) =>
      post<WhatsOnItem>(`/cafe/whats-on/${itemId}/save`, { founder_id: founderId, on }),

    // My District rooms
    district: (founderId: string) => request<DistrictOverview>(`/district${q(founderId)}`),
    districtVisit: (founderId: string, spot: DistrictSpot) => post<{ ok: boolean }>("/district/visit", { founder_id: founderId, spot }),
    journey: (founderId: string) => request<JourneyItem[]>(`/district/journey${q(founderId)}`),
    addJourney: (input: { founder_id: string; kind: "milestone" | "decision"; title: string; on: string; learned: string }) =>
      post<JourneyItem[]>("/district/journey", input),
    deleteJourney: (entryId: string, founderId: string) =>
      request<JourneyItem[]>(`/district/journey/${entryId}${q(founderId)}`, { method: "DELETE" }),
    business: (founderId: string) => request<BusinessRoom>(`/district/business${q(founderId)}`),
    setBusiness: (founderId: string, field: BusinessField, value: string) =>
      post<BusinessRoom>("/district/business", { founder_id: founderId, field, value }),
    needs: (founderId: string) => request<NeedsRoom>(`/district/needs${q(founderId)}`),
    addNeed: (founderId: string, kind: "need" | "goal" | "offer", value: string) =>
      post<NeedsRoom>("/district/needs", { founder_id: founderId, kind, value }),
    removeState: <T extends NeedsRoom | BusinessRoom>(stateId: string, founderId: string) =>
      request<T>(`/district/state/${stateId}${q(founderId)}`, { method: "DELETE" }),
    experiments: (founderId: string) => request<ExperimentItem[]>(`/district/experiments${q(founderId)}`),
    addExperiment: (input: { founder_id: string; title: string; tried: string; started_on: string }) =>
      post<ExperimentItem[]>("/district/experiments", input),
    updateExperiment: (
      expId: string,
      input: { founder_id: string; happened?: string; learned?: string; status?: ExperimentStatus },
    ) => post<ExperimentItem[]>(`/district/experiments/${expId}`, input),
    capabilities: (founderId: string) => request<CapabilityItem[]>(`/district/capabilities${q(founderId)}`),
    roomVisibility: (founderId: string) => request<VisibilitySettings>(`/district/visibility${q(founderId)}`),
    setRoomVisibility: (founderId: string, room: Room, audience: Audience) =>
      post<VisibilitySettings>("/district/visibility", { founder_id: founderId, room, audience }),

    // Quick Breaks toolkit
    simSuggestions: (founderId: string) => request<string[]>(`/toolkit/simulator/suggestions${q(founderId)}`),
    simulate: (founderId: string, assumption: string) =>
      post<Simulation>("/toolkit/simulator", { founder_id: founderId, assumption }),
    simulations: (founderId: string) => request<Simulation[]>(`/toolkit/simulator${q(founderId)}`),
    simulation: (simId: string, founderId: string) => request<Simulation>(`/toolkit/simulator/${simId}${q(founderId)}`),
    decideSimulation: (simId: string, input: { founder_id: string; chosen: "A" | "B"; reflection: string; save_to_journey: boolean }) =>
      post<Simulation>(`/toolkit/simulator/${simId}/decide`, input),
    industries: (founderId: string) => request<IndustryTopicSummary[]>(`/toolkit/industries${q(founderId)}`),
    // People: Explore, visiting a District, connections, opportunities
    peopleVisit: (founderId: string, spot: PeopleSpot) => post<{ ok: boolean }>("/people/visit", { founder_id: founderId, spot }),
    explore: (founderId: string) => request<ExploreResult>(`/people/explore${q(founderId)}`),
    visitDistrict: (userId: string, founderId: string) => request<VisitedDistrict>(`/people/${userId}/district${q(founderId)}`),
    meet: (userId: string, founderId: string) => request<Meet>(`/people/${userId}/meet${q(founderId)}`),
    connections: (founderId: string) => request<Connections>(`/connections${q(founderId)}`),
    requestConnection: (input: { founder_id: string; to_user_id: string; note: string; origin: "explore" | "visitor" | "opportunity" }) =>
      post<ConnectionRequestItem>("/connections/requests", input),
    respondToRequest: (requestId: string, founderId: string, accept: boolean) =>
      post<ConnectionRequestItem>(`/connections/requests/${requestId}/respond`, { founder_id: founderId, accept }),
    withdrawRequest: (requestId: string, founderId: string) =>
      post<ConnectionRequestItem>(`/connections/requests/${requestId}/withdraw`, { founder_id: founderId }),
    opportunities: (founderId: string) => request<OpportunitySummary[]>(`/opportunities${q(founderId)}`),
    opportunity: (oppId: string, founderId: string) => request<OpportunityDetail>(`/opportunities/${oppId}${q(founderId)}`),
    respondToOpportunity: (oppId: string, input: { founder_id: string; saved?: boolean; interested?: boolean; note?: string }) =>
      post<OpportunityDetail>(`/opportunities/${oppId}/respond`, input),
    // Me
    profile: (founderId: string) => request<Profile>(`/me${q(founderId)}`),
    updateProfile: (input: { founder_id: string; name?: string; one_line?: string; city?: string }) => post<Profile>("/me", input),
    setAvatar: (founderId: string, choice: AvatarChoice) => post<Profile>("/me/avatar", { founder_id: founderId, ...choice }),
    exportMyData: (founderId: string) => request<Record<string, unknown>>(`/me/export${q(founderId)}`),
    deleteAccount: (founderId: string) => post<{ ok: true }>("/me/delete", { founder_id: founderId, confirm: "DELETE" }),
    setInvestorRoom: (founderId: string, room: Room, on: boolean) =>
      post<VisibilitySettings>("/district/visibility/investors", { founder_id: founderId, room, on }),

    // Investor web app (the client keeps the investor id, as it does the founder id)
    investorDemoAccounts: () => request<InvestorAccount[]>("/investor/demo-accounts"),
    createInvestor: (name: string, firm: string) => post<InvestorAccount>("/investor", { name, firm }),
    investorHome: (investorId: string) => request<InvestorHome>(`/investor/home?investor_id=${investorId}`),
    investorThesis: (investorId: string) => request<InvestorThesis>(`/investor/thesis?investor_id=${investorId}`),
    setInvestorThesis: (investorId: string, t: Omit<InvestorThesis, "name">) =>
      post<InvestorThesis>("/investor/thesis", { investor_id: investorId, ...t }),
    investorIntroductions: (investorId: string) => request<InvestorIntro[]>(`/investor/introductions?investor_id=${investorId}`),
    respondToIntro: (requestId: string, investorId: string, accept: boolean) =>
      post<ConnectionRequestItem>(`/investor/introductions/${requestId}/respond`, { investor_id: investorId, accept }),
    investorFounder: (founderId: string, investorId: string) =>
      request<InvestorFounderView>(`/investor/founders/${founderId}?investor_id=${investorId}`),
    pipeline: (investorId: string) => request<Pipeline>(`/investor/pipeline?investor_id=${investorId}`),
    movePipeline: (founderId: string, investorId: string, stage: PipelineStage, note?: string) =>
      post<Pipeline>(`/investor/pipeline/${founderId}`, { investor_id: investorId, stage, note }),
    insights: (investorId: string) => request<Insights>(`/investor/insights?investor_id=${investorId}`),
    investorOpportunities: (investorId: string) =>
      request<InvestorOpportunity[]>(`/investor/opportunities?investor_id=${investorId}`),
    postOpportunity: (
      investorId: string,
      o: { kind: OpportunityKind; title: string; summary: string; what_they_need: string; timeline: string; how_to_respond: string; tags: string; closes_on: string | null },
    ) => post<{ id: string }>("/investor/opportunities", { investor_id: investorId, ...o }),

    industry: (slug: string, founderId: string) =>
      request<IndustryTopic>(`/toolkit/industries/${encodeURIComponent(slug)}${q(founderId)}`),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
