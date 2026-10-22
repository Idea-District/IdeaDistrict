import type {
  ApiErrorBody,
  ChatMessage,
  ChoiceInput,
  ChoiceResult,
  ContextAnswers,
  Conversation,
  ConversationSummary,
  Founder,
  FounderID,
  Health,
  KnownUnknown,
  OutcomeInput,
  OutcomeResult,
  PendingOutcome,
  Privacy,
  Recommendation,
  RecommendationResponse,
  RespondResult,
  RingsTrue,
  SituationView,
  TellMeMoreInput,
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
    conversations: (founderId: string) => request<ConversationSummary[]>(`/conversations${q(founderId)}`),
    conversation: (conversationId: string, founderId: string) =>
      request<Conversation>(`/conversations/${conversationId}${q(founderId)}`),
    sendMessage: (conversationId: string, founderId: string, body: string) =>
      post<ChatMessage>(`/conversations/${conversationId}/messages`, { founder_id: founderId, body }),

    // Outcomes
    pendingOutcomes: (founderId: string) => request<PendingOutcome[]>(`/outcomes/pending${q(founderId)}`),
    reportOutcome: (recommendationId: string, input: OutcomeInput) =>
      post<OutcomeResult>(`/recommendations/${recommendationId}/outcome`, input),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
