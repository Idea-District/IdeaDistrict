"""Importing this package registers every table on Base.metadata (used by Alembic)."""

from app.models.cafe import (
    Brew,
    BrewAnswer,
    BrewHelpful,
    CafeTable,
    TablePost,
    TableSeat,
    WhatsOn,
    WhatsOnSave,
)
from app.models.connections import ConnectionRequest, Opportunity, OpportunityResponse
from app.models.discovery import Choice, ContextAnswer, DiscoverySession, Situation
from app.models.district import Experiment, JourneyEntry, RoomVisibility
from app.models.id_model import IdAttribute, IdState, InformationGap, Signal
from app.models.identity import User, UserPrivacySettings
from app.models.infra import AiCall, Interaction, PromptVersion
from app.models.investor import InvestorThesis, PipelineEntry
from app.models.messaging import Conversation, ConversationParticipant, Message
from app.models.recommendations import NoMatchLog, Recommendation, RecommendationOutcome
from app.models.toolkit import IndustryTopic, Simulation

__all__ = [
    "Brew",
    "BrewAnswer",
    "BrewHelpful",
    "CafeTable",
    "TablePost",
    "TableSeat",
    "WhatsOn",
    "WhatsOnSave",
    "AiCall",
    "Choice",
    "ConnectionRequest",
    "ContextAnswer",
    "Conversation",
    "ConversationParticipant",
    "DiscoverySession",
    "Experiment",
    "JourneyEntry",
    "RoomVisibility",
    "IdAttribute",
    "IdState",
    "IndustryTopic",
    "InformationGap",
    "Interaction",
    "InvestorThesis",
    "Message",
    "NoMatchLog",
    "Opportunity",
    "OpportunityResponse",
    "PipelineEntry",
    "PromptVersion",
    "Recommendation",
    "RecommendationOutcome",
    "Signal",
    "Simulation",
    "Situation",
    "User",
    "UserPrivacySettings",
]
