from app.config import settings
from app.providers.base import TryOnProvider
from app.providers.hf_space_provider import HuggingFaceSpaceProvider
from app.providers.mock_provider import MockProvider
from app.providers.realtime_stub import RealTimeStreamStubProvider


def get_tryon_provider() -> TryOnProvider:
    """
    Factory function returning the configured virtual try-on inference provider.
    Always falls back to MockProvider if DEMO_MODE is True.
    """
    if settings.DEMO_MODE:
        return MockProvider()

    provider_type = settings.TRYON_PROVIDER.lower().strip()
    if provider_type == "hf_space":
        return HuggingFaceSpaceProvider(
            space_id=settings.HF_SPACE_ID,
            hf_token=settings.HF_API_TOKEN or None
        )
    elif provider_type == "realtime_stub":
        return RealTimeStreamStubProvider()
    elif provider_type == "mock":
        return MockProvider()
    else:
        # Default fallback
        return MockProvider()
