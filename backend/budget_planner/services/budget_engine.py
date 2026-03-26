"""
budget_engine.py
Dynamic Budget Engine (B2 Mode) — computes realistic trip budgets by
aggregating min/max prices across ALL five MongoDB datasets:
  transport, accommodation, food, activities, tourist spots.

Uses deterministic heuristics (meals_per_day, activities_count) scaled
by trip duration and budget tier.
"""
from __future__ import annotations

import re
from typing import Any

from database import (
    accommodation_collection,
    activity_collection,
    food_collection,
    spot_collection,
    transport_collection,
)

# ── Tier → MongoDB budget_category mapping ─────────────────────────────────────
_TIER_TO_DB: dict[str, str] = {
    "budget":   "budget_friendly",
    "moderate": "moderate",
    "luxury":   "luxury",
}

_TIERS = ["budget", "moderate", "luxury"]

# ── Fallback values (INR) when a collection has no data for a route ────────────
_FALLBACK: dict[str, dict[str, int]] = {
    "transport":      {"min": 1_000, "max": 5_000},
    "accommodation":  {"min": 500,   "max": 3_000},
    "food":           {"min": 200,   "max": 800},
    "activity":       {"min": 300,   "max": 1_500},
    "spot":           {"min": 50,    "max": 500},
}


# ── Public API ─────────────────────────────────────────────────────────────────

def calculate_budget_ranges(
    source_city: str,
    destination_city: str,
    days: int,
) -> dict[str, Any]:
    """
    Return total trip budget ranges for all three tiers.

    Returns
    -------
    {
        "budget_ranges": {
            "budget":   {"min": ..., "max": ...},
            "moderate": {"min": ..., "max": ...},
            "luxury":   {"min": ..., "max": ...},
        }
    }
    """
    days = max(1, days)
    result: dict[str, dict[str, int]] = {}

    for tier in _TIERS:
        db_cat = _TIER_TO_DB[tier]
        dest = destination_city.strip()
        src = source_city.strip()

        # ── Fetch aggregates from each collection ──────────────────────────
        transport = _agg_range(
            transport_collection,
            _route_match(src, dest, db_cat),
            price_field="adult_price_range",
        ) or _FALLBACK["transport"]

        accommodation = _agg_range(
            accommodation_collection,
            _city_match(dest, db_cat),
            price_field="adult_price_range",
        ) or _FALLBACK["accommodation"]

        food = _agg_range(
            food_collection,
            _city_match(dest, db_cat),
            price_field="adult_price_range",
        ) or _FALLBACK["food"]

        # Activities and spots do NOT have budget_category in the schema
        activity = _agg_range(
            activity_collection,
            _city_match_no_tier(dest),
            price_field="price_range_per_person",
        ) or _FALLBACK["activity"]

        spot = _agg_range(
            spot_collection,
            _city_match_no_tier(dest),
            price_field="entry_fee_range",
        ) or _FALLBACK["spot"]

        # ── Guard zero values ──────────────────────────────────────────────
        transport     = _guard_zeros(transport,     _FALLBACK["transport"])
        accommodation = _guard_zeros(accommodation, _FALLBACK["accommodation"])
        food          = _guard_zeros(food,          _FALLBACK["food"])
        activity      = _guard_zeros(activity,      _FALLBACK["activity"])
        spot          = _guard_zeros(spot,          _FALLBACK["spot"])

        # ── Heuristics ─────────────────────────────────────────────────────
        nights = max(1, days - 1)

        if tier == "budget":
            meals_per_day = 2
            activities_count = min(max(1, days - 1), 3)
        elif tier == "moderate":
            meals_per_day = 3
            activities_count = max(1, days - 1)
        else:  # luxury
            meals_per_day = 3
            activities_count = min(max(1, (days - 1) * 2), 10)

        # ── Total calculation ──────────────────────────────────────────────
        total_min = (
            transport["min"]
            + (accommodation["min"] * nights)
            + (food["min"] * meals_per_day * days)
            + (activity["min"] * activities_count)
            + (spot["min"] * activities_count)
        )

        total_max = (
            transport["max"]
            + (accommodation["max"] * nights)
            + (food["max"] * meals_per_day * days)
            + (activity["max"] * activities_count)
            + (spot["max"] * activities_count)
        )

        result[tier] = {"min": int(total_min), "max": int(total_max)}

    return {"budget_ranges": result}


# ── MongoDB aggregation helpers ────────────────────────────────────────────────

def _agg_range(
    collection: Any,
    match_filter: dict[str, Any],
    price_field: str,
) -> dict[str, int] | None:
    """
    Run a $match → $group aggregation to get the overall min and max
    from a two-element price array field (e.g. adult_price_range: [min, max]).
    Returns {"min": ..., "max": ...} or None if no documents match.
    """
    pipeline = [
        {"$match": match_filter},
        {
            "$group": {
                "_id": None,
                "min_price": {"$min": {"$arrayElemAt": [f"${price_field}", 0]}},
                "max_price": {"$max": {"$arrayElemAt": [f"${price_field}", 1]}},
            }
        },
    ]
    results = list(collection.aggregate(pipeline))
    if not results:
        return None

    doc = results[0]
    min_p = doc.get("min_price")
    max_p = doc.get("max_price")

    if min_p is None or max_p is None:
        return None

    return {"min": int(min_p), "max": int(max_p)}


# ── Match-filter builders ──────────────────────────────────────────────────────

def _route_match(src: str, dest: str, db_category: str) -> dict[str, Any]:
    """Transport: match source_city + destination_city + budget_category."""
    return {
        "source_city":      {"$regex": f"^{_esc(src)}$",  "$options": "i"},
        "destination_city": {"$regex": f"^{_esc(dest)}$", "$options": "i"},
        "budget_category":  db_category,
    }


def _city_match(city: str, db_category: str) -> dict[str, Any]:
    """Accommodation / Food: match city + budget_category."""
    return {
        "city":            {"$regex": f"^{_esc(city)}$", "$options": "i"},
        "budget_category": db_category,
    }


def _city_match_no_tier(city: str) -> dict[str, Any]:
    """Activities / Spots: match city only (no budget_category field)."""
    return {
        "city": {"$regex": f"^{_esc(city)}$", "$options": "i"},
    }


# ── Utility helpers ────────────────────────────────────────────────────────────

def _esc(text: str) -> str:
    """Escape special regex characters in user-supplied city names."""
    return re.escape(text.strip())


def _guard_zeros(
    values: dict[str, int],
    fallback: dict[str, int],
) -> dict[str, int]:
    """Replace 0-valued min/max with their fallback counterparts."""
    return {
        "min": values["min"] if values["min"] > 0 else fallback["min"],
        "max": values["max"] if values["max"] > 0 else fallback["max"],
    }
