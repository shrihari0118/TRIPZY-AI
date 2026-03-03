"""
mock_provider.py
MockPlanProvider — returns static, curated option lists per tier.
Used during development and demo. Replace with RealProvider for production.
All data here mirrors the existing frontend budgetPlans.ts static data.
"""
from __future__ import annotations
from budget_planner.models.budget_entities import BudgetTier
from budget_planner.providers.base_provider import BasePlanProvider


class MockPlanProvider(BasePlanProvider):
    """Static mock data provider. Safe for demo and CI environments."""

    # ── Transport ──────────────────────────────────────────────────────────────

    _TRANSPORT: dict[str, list[str]] = {
        "budget":   ["AC Sleeper Bus", "Non-AC Bus", "3A Train", "2S Train"],
        "moderate": ["AC Chair Car", "3A Train", "Economy Flight", "Semi-sleeper Bus"],
        "luxury":   ["Business Flight", "Premium train cabin", "Private SUV transfer"],
    }

    _SAME_CITY_TRANSPORT: list[str] = ["Local Metro / Auto", "Cab", "E-Rickshaw"]

    # ── Accommodation ──────────────────────────────────────────────────────────

    _ACCOMMODATION: dict[str, list[str]] = {
        "budget":   ["Hostel dorm", "2-star hotel", "Homestay"],
        "moderate": ["3-star hotel", "Boutique stay", "Serviced apartment"],
        "luxury":   ["5-star resort", "Heritage palace stay", "Luxury villa"],
    }

    _LONG_TRIP_ACCOMMODATION_SUFFIX = "Extended stay / monthly rate"

    # ── Food ──────────────────────────────────────────────────────────────────

    _FOOD: dict[str, list[str]] = {
        "budget":   ["Street food", "Local thali", "Canteen meals"],
        "moderate": ["Regional specials", "Cafe combos", "Mix of street + cafes"],
        "luxury":   ["Chef tasting menu", "Fine dining", "Rooftop lounges"],
    }

    # ── Activities ────────────────────────────────────────────────────────────

    _ACTIVITIES: dict[str, list[str]] = {
        "budget": [
            "Street food walk",
            "Local market trail",
            "Sunset viewpoint",
            "Budget city tour",
            "Temple hop",
            "Riverside stroll",
        ],
        "moderate": [
            "Guided heritage tour",
            "Lake boating",
            "Live folk show",
            "Cafe hopping",
            "Museum pass",
            "Craft workshop",
        ],
        "luxury": [
            "Private photography tour",
            "Spa session",
            "Cultural performance",
            "Shopping concierge",
            "Private yacht evening",
            "Helicopter viewpoint",
        ],
    }

    _LONG_TRIP_BONUS_ACTIVITIES: dict[str, list[str]] = {
        "budget":   ["Volunteer day trip", "Cycling trail"],
        "moderate": ["Day hike", "Cooking class"],
        "luxury":   ["Private vineyard tour", "Sunrise hot air balloon"],
    }

    # ── Spots ─────────────────────────────────────────────────────────────────

    _SPOTS: dict[str, str] = {
        "budget":   "Heritage lanes, ghats, free museums",
        "moderate": "Top landmarks, guided city walk",
        "luxury":   "Private sunrise tours, premium viewpoints",
    }

    _SAME_CITY_SPOTS = "Local neighbourhood walks, hidden gems"

    # ── Titles & Descriptions ─────────────────────────────────────────────────

    _TITLES: dict[str, str] = {
        "budget":   "Budget-Friendly",
        "moderate": "Moderate",
        "luxury":   "Luxury",
    }

    _DESCRIPTIONS: dict[str, str] = {
        "budget":   "Student-first trips focused on essentials and discovery.",
        "moderate": "Balanced comfort with curated city highlights.",
        "luxury":   "Premium stays and private experiences throughout.",
    }

    # ── Interface Implementation ───────────────────────────────────────────────

    def get_transport_options(self, tier: BudgetTier, is_same_city: bool) -> list[str]:
        if is_same_city:
            return list(self._SAME_CITY_TRANSPORT)
        return list(self._TRANSPORT[tier])

    def get_accommodation_options(self, tier: BudgetTier, is_long_trip: bool = False) -> list[str]:
        options = list(self._ACCOMMODATION[tier])
        if is_long_trip and self._LONG_TRIP_ACCOMMODATION_SUFFIX not in options:
            options.append(self._LONG_TRIP_ACCOMMODATION_SUFFIX)
        return options

    def get_food_options(self, tier: BudgetTier) -> list[str]:
        return list(self._FOOD[tier])

    def get_activity_options(
        self,
        tier: BudgetTier,
        is_short_trip: bool,
        is_long_trip: bool,
    ) -> list[str]:
        options = list(self._ACTIVITIES[tier])
        if is_long_trip:
            bonus = self._LONG_TRIP_BONUS_ACTIVITIES.get(tier, [])
            for activity in bonus:
                if activity not in options:
                    options.append(activity)
        if is_short_trip:
            # Trim to 4 options for short trips
            options = options[:4]
        return options

    def get_spots(self, tier: BudgetTier, is_same_city: bool) -> str:
        if is_same_city:
            return self._SAME_CITY_SPOTS
        return self._SPOTS[tier]

    def get_plan_title(self, tier: BudgetTier) -> str:
        return self._TITLES[tier]

    def get_plan_description(self, tier: BudgetTier) -> str:
        return self._DESCRIPTIONS[tier]
