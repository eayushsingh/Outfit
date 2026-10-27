from abc import ABC, abstractmethod
from typing import Any


class TryOnProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Machine identifier for provider."""
        pass

    @property
    @abstractmethod
    def display_name(self) -> str:
        """Human-readable provider name."""
        pass

    @property
    @abstractmethod
    def is_demo(self) -> bool:
        """True if this provider is a local mock/demo."""
        pass

    @property
    @abstractmethod
    def license_name(self) -> str:
        """Exact license name."""
        pass

    @property
    @abstractmethod
    def license_url(self) -> str:
        """URL to official license text."""
        pass

    @property
    @abstractmethod
    def is_commercial_allowed(self) -> bool:
        """Whether this provider can be legally used in a commercial product."""
        pass

    @abstractmethod
    async def generate(
        self,
        person_image_bytes: bytes,
        garment_image_bytes: bytes,
        category: str = "upper_body",
        options: dict[str, Any] | None = None
    ) -> bytes:
        """
        Executes virtual try-on inference.
        Returns the resulting JPEG/PNG image bytes.
        """
        pass
