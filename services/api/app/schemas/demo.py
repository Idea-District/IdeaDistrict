"""Request/response models for the demo endpoints. Mirrors packages/api-client/src/types.ts."""

import uuid
from typing import Literal

from pydantic import BaseModel, Field

Confidence = Literal["low", "medium", "high"]
Facet = Literal["primary", "secondary"]
Source = Literal["declared", "observed", "inferred", "validated"]
RingsTrue = Literal["yes", "partly", "no"]


class FounderIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class FounderOut(BaseModel):
    id: uuid.UUID
    name: str


class FounderRef(BaseModel):
    founder_id: uuid.UUID


class ContextIn(FounderRef):
    working_on: str = Field(min_length=2, max_length=1500)
    hoping_for: str = Field(min_length=2, max_length=1500)
    in_the_way: str = Field(min_length=2, max_length=1500)


class KnownItem(BaseModel):
    dimension: str
    text: str
    source: Source


class UnknownItem(BaseModel):
    dimension: str
    label: str


class KnownUnknown(BaseModel):
    known: list[KnownItem]
    unknown: list[UnknownItem]


class SituationOption(BaseModel):
    id: str
    text: str


class SituationView(BaseModel):
    session_id: uuid.UUID
    situation_id: uuid.UUID
    sequence_no: int
    total: int
    dimension: str
    why_asking: str
    consequence: str | None
    situation: str
    question: str
    options: list[SituationOption]


class ChoiceIn(FounderRef):
    option_id: str = Field(min_length=1, max_length=4)
    why: str | None = Field(default=None, max_length=600)
    response_time_ms: int | None = Field(default=None, ge=0)


class SignalView(BaseModel):
    text: str
    evidence: str
    type: Literal["observed"] = "observed"
    confidence: float


class ChoiceResult(BaseModel):
    signal: SignalView
    done: bool
    remaining_unknowns: list[UnknownItem]


class StateItem(BaseModel):
    field: str
    value: str
    confidence: Confidence
    facet: Facet
    source: Source


class PersonAttribute(BaseModel):
    dimension: str
    insight: str
    confidence: Confidence
    strength: float
    evidence: str
    facet: Facet


class Gap(BaseModel):
    dimension: str
    question: str
    why_it_matters: str
    status: Literal["open", "probing", "closed"]


class FounderID(BaseModel):
    founder: FounderOut
    decisions: int
    built_at: str | None
    headline: str
    state: list[StateItem]
    person: list[PersonAttribute]
    gaps: list[Gap]
    overall_confidence: Literal["developing", "established"]
    rings_true: RingsTrue | None = None


class TellMeMoreIn(FounderRef):
    text: str = Field(min_length=3, max_length=2000)


class MatchPerson(BaseModel):
    name: str
    building: str
    stage: str
    city: str
    role: Literal["founder", "investor"] = "founder"


class MatchOut(BaseModel):
    kind: Literal["match"] = "match"
    id: uuid.UUID
    person: MatchPerson
    match_type: str
    why_now: str
    why_them: str
    what_could_happen: str
    confidence: Confidence
    confidence_reason: str


class NoMatchOut(BaseModel):
    kind: Literal["none"] = "none"
    reasons: list[str]


class RespondIn(FounderRef):
    response: Literal["accept", "decline"]


class RespondOut(BaseModel):
    ok: Literal[True] = True
    conversation_id: uuid.UUID | None


class RingsTrueIn(FounderRef):
    answer: RingsTrue


# ── Privacy ─────────────────────────────────────────────────────────────


class PrivacyOut(BaseModel):
    id_visible_to_investors: bool
    state_visible_to_investors: bool
    allow_introductions: bool


class PrivacyIn(FounderRef):
    id_visible_to_investors: bool | None = None
    state_visible_to_investors: bool | None = None
    allow_introductions: bool | None = None


# ── Messaging ───────────────────────────────────────────────────────────


class ChatMessageOut(BaseModel):
    id: uuid.UUID
    from_me: bool
    body: str
    sent_at: str


class ConversationSummaryOut(BaseModel):
    id: uuid.UUID
    with_: MatchPerson = Field(serialization_alias="with")
    origin: str
    last_message: str | None
    last_message_at: str | None
    unread: int


class ConversationOut(BaseModel):
    id: uuid.UUID
    with_: MatchPerson = Field(serialization_alias="with")
    origin: str
    introduced_at: str
    messages: list[ChatMessageOut]


class SendMessageIn(FounderRef):
    body: str = Field(min_length=1, max_length=4000)


# ── Outcomes ────────────────────────────────────────────────────────────


class PendingOutcomeOut(BaseModel):
    recommendation_id: uuid.UUID
    with_: MatchPerson = Field(serialization_alias="with")
    introduced_at: str


class OutcomeIn(FounderRef):
    did_meet: bool
    was_useful: Literal["not_really", "yes", "very"] | None = None
    will_talk_again: Literal["already", "maybe", "no"] | None = None


class OutcomeOut(BaseModel):
    validated: bool
    what_changed: str
