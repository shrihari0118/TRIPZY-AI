"""
real_provider.py
RealPlanProvider — stub for future integration with live travel APIs.
Swap this in by changing ACTIVE_PROVIDER in budget_generator.py.
"""
from __future__ import annotations
from budget_planner.models.budget_entities import BudgetTier
from budget_planner.providers.base_provider import BasePlanProvider


class RealPlanProvider(BasePlanProvider):
    """
    Future real API provider.
    TODO: Integrate with travel APIs (e.g. Amadeus, MakeMyTrip, RailYatri)
          to fetch live transport, accommodation, and activity options.
    """

    def get_transport_options(self, tier: BudgetTier, is_same_city: bool) -> list[str]:
        # TODO: Call transport search API (e.g. RailYatri, RedBus, IndiGo)
        # TODO: Filter by tier price band and availability
        raise NotImplementedError("RealPlanProvider.get_transport_options not yet implemented")

    def get_accommodation_options(self, tier: BudgetTier, is_long_trip: bool = False) -> list[str]:
        # TODO: Call hotel search API (e.g. Booking.com, OYO, Airbnb)
        # TODO: Filter by star rating matching tier
        raise NotImplementedError("RealPlanProvider.get_accommodation_options not yet implemented")

    def get_food_options(self, tier: BudgetTier) -> list[str]:
        # TODO: Call restaurant/food API (e.g. Zomato, Google Places)
        # TODO: Filter by price range matching tier
        raise NotImplementedError("RealPlanProvider.get_food_options not yet implemented")

    def get_activity_options(
        self,
        tier: BudgetTier,
        is_short_trip: bool,
        is_long_trip: bool,
    ) -> list[str]:
        # TODO: Call activities API (e.g. Viator, GetYourGuide, Google Things to Do)
        raise NotImplementedError("RealPlanProvider.get_activity_options not yet implemented")

    def get_spots(self, tier: BudgetTier, is_same_city: bool) -> str:
        # TODO: Call Google Places / TripAdvisor API for top spots
        raise NotImplementedError("RealPlanProvider.get_spots not yet implemented")

    def get_plan_title(self, tier: BudgetTier) -> str:
        # Titles are static invariants — same as MockProvider
        _TITLES = {"budget": "Budget-Friendly", "moderate": "Moderate", "luxury": "Luxury"}
        return _TITLES[tier]

    def get_plan_description(self, tier: BudgetTier) -> str:
        # Descriptions are static invariants — same as MockProvider
        _DESCRIPTIONS = {
            "budget":   "Student-first trips focused on essentials and discovery.",
            "moderate": "Balanced comfort with curated city highlights.",
            "luxury":   "Premium stays and private experiences throughout.",
        }
        return _DESCRIPTIONS[tier]
