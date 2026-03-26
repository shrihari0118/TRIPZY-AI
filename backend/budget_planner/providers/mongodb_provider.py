"""
mongodb_provider.py
MongoDBPlanProvider — fetches plan options from MongoDB Atlas collections
using the Hybrid Recommendation Strategy (filter → sort → limit → sample).

Implements BasePlanProvider so it can be swapped in via ACTIVE_PROVIDER in
budget_generator.py.
"""
from __future__ import annotations

import random
from typing import Any

from pymongo.collection import Collection

from budget_planner.models.budget_entities import BudgetTier
from budget_planner.providers.base_provider import BasePlanProvider
from database import (
    accommodation_collection,
    activity_collection,
    food_collection,
    spot_collection,
    transport_collection,
)

# ── Tier mapping ───────────────────────────────────────────────────────────────
# Pydantic BudgetTier uses "budget" / "moderate" / "luxury",
# but MongoDB documents store budget_category as "budget_friendly" / "moderate" / "luxury".
_TIER_TO_DB_CATEGORY: dict[str, str] = {
    "budget":   "budget_friendly",
    "moderate": "moderate",
    "luxury":   "luxury",
}

# ── Pool / sample sizes ───────────────────────────────────────────────────────
_POOL_LIMIT = 15  # top-N pool before random sampling

_SAMPLE_SIZES: dict[str, int] = {
    "transport":      2,
    "accommodation":  2,
    "food":           2,
    "tourist_spots":  3,
    "activities":     2,
}

# ── Titles & Descriptions (static invariants) ─────────────────────────────────
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


# ── Helpers ────────────────────────────────────────────────────────────────────

def _hybrid_query(
    collection: Collection,
    match_filter: dict[str, Any],
    pool_limit: int = _POOL_LIMIT,
    sample_size: int = 2,
) -> list[dict[str, Any]]:
    """
    Hybrid Recommendation Strategy:
      1. $match  – filter by city / budget_category / price constraint
      2. $sort   – rating descending
      3. $limit  – top N pool
      4. Python random.sample – pick final K results

    Returns up to *sample_size* documents (fewer if the pool is smaller).
    """
    pipeline: list[dict[str, Any]] = [
        {"$match": match_filter},
        {"$sort": {"rating": -1}},
        {"$limit": pool_limit},
    ]
    pool = list(collection.aggregate(pipeline))
    if not pool:
        return []
    k = min(sample_size, len(pool))
    return random.sample(pool, k)


def _safe_min_price(doc: dict[str, Any], field: str = "adult_price_range") -> int:
    """Extract min price (index 0) from a price-range array, defaulting to 0."""
    pr = doc.get(field)
    if isinstance(pr, (list, tuple)) and len(pr) >= 1:
        try:
            return int(pr[0])
        except (TypeError, ValueError):
            return 0
    return 0


# ── Provider Implementation ───────────────────────────────────────────────────

class MongoDBPlanProvider(BasePlanProvider):
    """
    Production provider backed by MongoDB Atlas collections.
    Falls back to empty lists / generic strings when no data is found.
    """

    # ── Transport ──────────────────────────────────────────────────────────

    def get_transport_options(
        self,
        tier: BudgetTier,
        is_same_city: bool,
        *,
        source_city: str | None = None,
        destination_city: str | None = None,
        budget_limit: int | None = None,
    ) -> list[str]:
        if is_same_city:
            return ["Local Metro / Auto", "Cab", "E-Rickshaw"]

        if not source_city or not destination_city:
            return []

        db_category = _TIER_TO_DB_CATEGORY[tier]
        match_filter: dict[str, Any] = {
            "source_city": {"$regex": f"^{_esc(source_city)}$", "$options": "i"},
            "destination_city": {"$regex": f"^{_esc(destination_city)}$", "$options": "i"},
            "budget_category": db_category,
        }
        if budget_limit is not None:
            match_filter["adult_price_range.0"] = {"$lte": budget_limit}

        docs = _hybrid_query(
            transport_collection,
            match_filter,
            sample_size=_SAMPLE_SIZES["transport"],
        )
        return [_format_transport(doc) for doc in docs]

    # ── Accommodation ──────────────────────────────────────────────────────

    def get_accommodation_options(
        self,
        tier: BudgetTier,
        is_long_trip: bool = False,
        *,
        destination_city: str | None = None,
        budget_limit: int | None = None,
    ) -> list[str]:
        if not destination_city:
            return []

        db_category = _TIER_TO_DB_CATEGORY[tier]
        match_filter: dict[str, Any] = {
            "city": {"$regex": f"^{_esc(destination_city)}$", "$options": "i"},
            "budget_category": db_category,
        }
        if budget_limit is not None:
            match_filter["adult_price_range.0"] = {"$lte": budget_limit}

        docs = _hybrid_query(
            accommodation_collection,
            match_filter,
            sample_size=_SAMPLE_SIZES["accommodation"],
        )
        return [_format_accommodation(doc) for doc in docs]

    # ── Food ───────────────────────────────────────────────────────────────

    def get_food_options(
        self,
        tier: BudgetTier,
        *,
        destination_city: str | None = None,
        budget_limit: int | None = None,
    ) -> list[str]:
        if not destination_city:
            return []

        db_category = _TIER_TO_DB_CATEGORY[tier]
        match_filter: dict[str, Any] = {
            "city": {"$regex": f"^{_esc(destination_city)}$", "$options": "i"},
            "budget_category": db_category,
        }
        if budget_limit is not None:
            match_filter["adult_price_range.0"] = {"$lte": budget_limit}

        docs = _hybrid_query(
            food_collection,
            match_filter,
            sample_size=_SAMPLE_SIZES["food"],
        )
        return [_format_food(doc) for doc in docs]

    # ── Activities ─────────────────────────────────────────────────────────

    def get_activity_options(
        self,
        tier: BudgetTier,
        is_short_trip: bool,
        is_long_trip: bool,
        *,
        destination_city: str | None = None,
        budget_limit: int | None = None,
    ) -> list[str]:
        if not destination_city:
            return []

        # Activities don't have budget_category — filter by city + price only
        match_filter: dict[str, Any] = {
            "city": {"$regex": f"^{_esc(destination_city)}$", "$options": "i"},
        }
        if budget_limit is not None:
            match_filter["price_range_per_person.0"] = {"$lte": budget_limit}

        # Fetch a larger pool so we can serve both default and options lists
        sample_count = _SAMPLE_SIZES["activities"]
        if is_long_trip:
            sample_count += 2  # extra activities for long trips
        if is_short_trip:
            sample_count = max(sample_count, 2)

        docs = _hybrid_query(
            activity_collection,
            match_filter,
            sample_size=sample_count,
        )
        return [_format_activity(doc) for doc in docs]

    # ── Tourist Spots ──────────────────────────────────────────────────────

    def get_spots(
        self,
        tier: BudgetTier,
        is_same_city: bool,
        *,
        destination_city: str | None = None,
        budget_limit: int | None = None,
    ) -> str:
        if is_same_city:
            return "Local neighbourhood walks, hidden gems"

        if not destination_city:
            return ""

        match_filter: dict[str, Any] = {
            "city": {"$regex": f"^{_esc(destination_city)}$", "$options": "i"},
        }
        if budget_limit is not None:
            match_filter["entry_fee_range.0"] = {"$lte": budget_limit}

        docs = _hybrid_query(
            spot_collection,
            match_filter,
            sample_size=_SAMPLE_SIZES["tourist_spots"],
        )
        if not docs:
            return ""
        place_names = [doc.get("place_name", "Unknown") for doc in docs]
        return ", ".join(place_names)

    # ── Budget Range (dynamic slider limits) ─────────────────────────────

    def get_transport_budget_range(
        self,
        tier: BudgetTier,
        *,
        source_city: str,
        destination_city: str,
    ) -> dict[str, int] | None:
        """
        Aggregate min(adult_price_range[0]) and max(adult_price_range[1])
        across all transport documents matching the route + budget category.
        Returns {"min": ..., "max": ...} or None if no documents match.
        """
        db_category = _TIER_TO_DB_CATEGORY[tier]
        pipeline = [
            {
                "$match": {
                    "source_city": {"$regex": f"^{_esc(source_city)}$", "$options": "i"},
                    "destination_city": {"$regex": f"^{_esc(destination_city)}$", "$options": "i"},
                    "budget_category": db_category,
                }
            },
            {
                "$group": {
                    "_id": None,
                    "min_price": {"$min": {"$arrayElemAt": ["$adult_price_range", 0]}},
                    "max_price": {"$max": {"$arrayElemAt": ["$adult_price_range", 1]}},
                }
            },
        ]
        results = list(transport_collection.aggregate(pipeline))
        if not results:
            return None

        doc = results[0]
        min_price = doc.get("min_price")
        max_price = doc.get("max_price")

        # Guard against None values (e.g. documents with missing price arrays)
        if min_price is None or max_price is None:
            return None

        return {"min": int(min_price), "max": int(max_price)}

    # ── Static metadata ───────────────────────────────────────────────────

    def get_plan_title(self, tier: BudgetTier) -> str:
        return _TITLES[tier]

    def get_plan_description(self, tier: BudgetTier) -> str:
        return _DESCRIPTIONS[tier]


# ── Formatting helpers ─────────────────────────────────────────────────────────

def _format_transport(doc: dict[str, Any]) -> str:
    transport_type = doc.get("transport_type", "Transport")
    min_price = _safe_min_price(doc)
    duration = doc.get("duration_hours", "")
    label = f"{transport_type} (₹{min_price:,})"
    if duration:
        label += f" ~{duration}h"
    return label


def _format_accommodation(doc: dict[str, Any]) -> str:
    stay_type = doc.get("stay_type", "Stay")
    rating = doc.get("rating", "")
    min_price = _safe_min_price(doc)
    return f"{stay_type} at {rating}★ (₹{min_price:,}/night)"


def _format_food(doc: dict[str, Any]) -> str:
    food_type = doc.get("food_type", "Food")
    restaurant = doc.get("restaurant_name", "")
    min_price = _safe_min_price(doc)
    return f"{food_type} at {restaurant} (₹{min_price:,}/meal)"


def _format_activity(doc: dict[str, Any]) -> str:
    name = doc.get("activity_name", "Activity")
    duration = doc.get("duration_hours", "")
    min_price = _safe_min_price(doc, field="price_range_per_person")
    return f"{name} - {duration} hrs (₹{min_price:,})"


def _esc(text: str) -> str:
    """Escape special regex characters in user-supplied city names."""
    import re
    return re.escape(text.strip())
