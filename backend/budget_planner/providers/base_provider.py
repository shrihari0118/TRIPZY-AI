"""
base_provider.py
Abstract base class for plan data providers.
Swap MockProvider for MongoDBProvider by changing the instantiation in budget_generator.py.
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from budget_planner.models.budget_entities import BudgetTier


class BasePlanProvider(ABC):
    """
    Defines the interface all plan providers must implement.
    The rule engine calls these methods to get tier-specific option lists.

    Parameters ``destination_city``, ``source_city``, and ``budget_limit``
    are optional (defaulting to ``None``) so that existing providers
    (MockPlanProvider) continue to work without changes.
    """

    @abstractmethod
    def get_transport_options(
        self,
        tier: BudgetTier,
        is_same_city: bool,
        *,
        source_city: str | None = None,
        destination_city: str | None = None,
        budget_limit: int | None = None,
    ) -> list[str]:
        """Return ordered transport options for the given tier. First item is the default."""
        ...

    @abstractmethod
    def get_accommodation_options(
        self,
        tier: BudgetTier,
        is_long_trip: bool = False,
        *,
        destination_city: str | None = None,
        budget_limit: int | None = None,
    ) -> list[str]:
        """Return ordered accommodation options. First item is the default."""
        ...

    @abstractmethod
    def get_food_options(
        self,
        tier: BudgetTier,
        *,
        destination_city: str | None = None,
        budget_limit: int | None = None,
    ) -> list[str]:
        """Return ordered food options. First item is the default."""
        ...

    @abstractmethod
    def get_activity_options(
        self,
        tier: BudgetTier,
        is_short_trip: bool,
        is_long_trip: bool,
        *,
        destination_city: str | None = None,
        budget_limit: int | None = None,
    ) -> list[str]:
        """Return activity options. First 4 become plan.activities."""
        ...

    @abstractmethod
    def get_spots(
        self,
        tier: BudgetTier,
        is_same_city: bool,
        *,
        destination_city: str | None = None,
        budget_limit: int | None = None,
    ) -> str:
        """Return the tourist spots summary string for the given tier."""
        ...

    @abstractmethod
    def get_transport_budget_range(
        self,
        tier: BudgetTier,
        *,
        source_city: str,
        destination_city: str,
    ) -> dict[str, int] | None:
        """
        Return {"min": <int>, "max": <int>} computed from adult_price_range
        for the given route and budget tier, or None if no data found.
        """
        ...

    @abstractmethod
    def get_plan_title(self, tier: BudgetTier) -> str:
        """Return the display title for the tier."""
        ...

    @abstractmethod
    def get_plan_description(self, tier: BudgetTier) -> str:
        """Return the display description for the tier."""
        ...

