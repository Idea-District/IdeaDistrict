from dataclasses import dataclass, field
from typing import Protocol


@dataclass(frozen=True)
class ProviderRequest:
    purpose: str  # which of the AI jobs this is, e.g. "generate_situation"
    system: str
    prompt: str
    json_schema: dict
    max_output_tokens: int = 1500
    model: str | None = None  # None = the provider's default
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True)
class ProviderResponse:
    text: str  # raw model output; the client extracts and validates the JSON
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    stop_reason: str = "end"  # "max_tokens" means truncated — the client treats it as a failure
    cost_usd: float = 0.0


class AIProvider(Protocol):
    """Anything that can answer a prompt with JSON text.

    To plug in a new AI tool, implement this one method and register it in
    providers/__init__.py. Nothing else in the codebase changes.
    """

    name: str

    def complete(self, request: ProviderRequest) -> ProviderResponse: ...
