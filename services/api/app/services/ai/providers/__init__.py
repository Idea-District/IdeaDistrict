from app.core.config import Settings
from app.services.ai.providers.base import AIProvider, ProviderRequest, ProviderResponse
from app.services.ai.providers.mila import MilaProvider
from app.services.ai.providers.mock import MockProvider

__all__ = ["AIProvider", "ProviderRequest", "ProviderResponse", "get_provider"]


def get_provider(settings: Settings) -> AIProvider:
    """The one place that decides which AI tool answers. Add new providers here."""
    providers = {
        "mock": lambda: MockProvider(),
        "mila": lambda: MilaProvider(settings),
    }
    try:
        return providers[settings.ai_provider]()
    except KeyError:
        raise ValueError(
            f"Unknown AI_PROVIDER '{settings.ai_provider}'. Known: {', '.join(providers)}"
        ) from None
