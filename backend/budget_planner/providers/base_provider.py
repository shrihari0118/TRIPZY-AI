"""
base_provider.py
Abstract base class for plan data providers.
Swap MockProvider for RealProvider by changing the instantiation in budget_generator.py.
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from budget_planner.models.budget_entities import BudgetTier


class BasePlanProvider(ABC):
    """
    Defines the interface all plan providers must implement.
    The rule engine calls these methods to get tier-specific option lists.
    """

    @abstractmethod
    def get_transport_options(self, tier: BudgetTier, is_same_city: bool) -> list[str]:
        """Return ordered transport options for the given tier. First item is the default."""
        ...

    @abstractmethod
    def get_accommodation_options(self, tier: BudgetTier) -> list[str]:
        """Return ordered accommodation options. First item is the default."""
        ...

    @abstractmethod
    def get_food_options(self, tier: BudgetTier) -> list[str]:
        """Return ordered food options. First item is the default."""
        ...

    @abstractmethod
    def get_activity_options(
        self,
        tier: BudgetTier,
        is_short_trip: bool,
        is_long_trip: bool,
    ) -> list[str]:
        """Return activity options. First 4 become plan.activities."""
        ...

    @abstractmethod
    def get_spots(self, tier: BudgetTier, is_same_city: bool) -> str:
        """Return the tourist spots summary string for the given tier."""
        ...

    @abstractmethod
    def get_plan_title(self, tier: BudgetTier) -> str:
        """Return the display title for the tier."""
        ...

    @abstractmethod
    def get_plan_description(self, tier: BudgetTier) -> str:
        """Return the display description for the tier."""
        ...
