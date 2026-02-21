"""Abstract base class for HTA agency adapters.

Each country's HTA agency (HAS, G-BA, NICE, etc.) implements this interface
so the application can query assessments uniformly across countries.
"""

from abc import ABC, abstractmethod

from app.models import AssessmentResult, CountryInfo


class HTAAgency(ABC):
    """Base class that all country HTA agency adapters must implement."""

    @property
    @abstractmethod
    def country_code(self) -> str:
        """ISO 3166-1 alpha-2 country code (e.g., 'FR', 'DE', 'GB')."""
        ...

    @property
    @abstractmethod
    def country_name(self) -> str:
        """Full country name in English."""
        ...

    @property
    @abstractmethod
    def agency_abbreviation(self) -> str:
        """Short agency name (e.g., 'HAS', 'G-BA', 'NICE')."""
        ...

    @property
    @abstractmethod
    def agency_full_name(self) -> str:
        """Full agency name."""
        ...

    @abstractmethod
    async def load_data(self) -> None:
        """Fetch and cache the agency's assessment data."""
        ...

    @abstractmethod
    async def search_assessments(
        self,
        active_substance: str,
        product_name: str | None = None,
    ) -> list[AssessmentResult]:
        """Search for HTA assessments by active substance and optionally product name.

        Args:
            active_substance: The INN/active substance to search for.
            product_name: Optional brand/product name to narrow results.

        Returns:
            List of assessment results with ratings and links.
        """
        ...

    @property
    def is_loaded(self) -> bool:
        """Whether data has been loaded. Override if tracking load state."""
        return False

    def get_country_info(self) -> CountryInfo:
        return CountryInfo(
            code=self.country_code,
            name=self.country_name,
            agency=self.agency_abbreviation,
            agency_full_name=self.agency_full_name,
            is_loaded=self.is_loaded,
        )
