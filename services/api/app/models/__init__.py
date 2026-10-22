"""Importing this package registers every table on Base.metadata (used by Alembic)."""

from app.models.discovery import Choice, ContextAnswer, DiscoverySession, Situation
from app.models.id_model import IdAttribute, IdState, InformationGap, Signal
from app.models.identity import User, UserPrivacySettings
from app.models.infra import AiCall, Interaction, PromptVersion
from app.models.messaging import Conversation, ConversationParticipant, Message
from app.models.recommendations import NoMatchLog, Recommendation, RecommendationOutcome

__all__ = [
    "AiCall",
    "Choice",
    "ContextAnswer",
    "Conversation",
    "ConversationParticipant",
    "DiscoverySession",
    "IdAttribute",
    "IdState",
    "InformationGap",
    "Interaction",
    "Message",
    "NoMatchLog",
    "PromptVersion",
    "Recommendation",
    "RecommendationOutcome",
    "Signal",
    "Situation",
    "User",
    "UserPrivacySettings",
]
