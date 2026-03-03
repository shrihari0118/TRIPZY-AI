"""
cost_calculator.py
Deterministic cost range computation per the Step 3 / Step B rule engine spec.

Base daily costs (INR, per adult):
  Budget:   transport ₹400 + accommodation ₹500 + food ₹250 = ₹1,150/day + ₹500 activities flat
  Moderate: transport ₹900 + accommodation ₹1,800 + food ₹600 = ₹3,300/day + ₹1,500 activities flat
  Luxury:   transport ₹2,500 + accommodation ₹6,000 + food ₹1,800 = ₹10,300/day + ₹5,000 activities flat

Child discount multipliers (Step B):
  transport     0.50×  (half-price child fare)
  accommodation 0.30×  (child shares room — marginal cost only)
  food          0.60×  (kids menu / smaller portions)
  activities    0.50×  (per child, applied to the flat fee)

Formula:
  adult_daily(tier) = transport + accommodation + food
  child_daily(tier) = (transport × 0.50) + (accommodation × 0.30) + (food × 0.60)
  activity_cost     = flat + (flat × 0.50 × children)
  base_cost         = (adult_daily × adults × days) + (child_daily × children × days) + activity_cost
  min_cost          = round(base_cost × 0.90, -2)   # 10% below, rounded to ₹100
  max_cost          = round(base_cost × 1.15, -2)   # 15% above, rounded to ₹100

Backward compatibility:
  adults=1, children=0  →  identical output to the original single-person Step 3 formula.
"""
from __future__ import annotations

import random

from budget_planner.models.budget_entities import BudgetTier

# ── Per-category adult daily costs ─────────────────────────────────────────────

_TRANSPORT_DAILY: dict[str, int] = {
    "budget":   400,
    "moderate": 900,
    "luxury":   2_500,
}

_ACCOMMODATION_DAILY: dict[str, int] = {
    "budget":   500,
    "moderate": 1_800,
    "luxury":   6_000,
}

_FOOD_DAILY: dict[str, int] = {
    "budget":   250,
    "moderate": 600,
    "luxury":   1_800,
}

_ACTIVITY_FLATS: dict[str, int] = {
    "budget":   500,
    "moderate": 1_500,
    "luxury":   5_000,
}

# Same-city transport override — lower daily transport cost for local trips
_SAME_CITY_TRANSPORT_DAILY: dict[str, int] = {
    "budget":   100,
    "moderate": 200,
    "luxury":   500,
}

# ── Child discount multipliers (Step B) ────────────────────────────────────────

_CHILD_TRANSPORT_MULTIPLIER:     float = 0.50
_CHILD_ACCOMMODATION_MULTIPLIER: float = 0.30
_CHILD_FOOD_MULTIPLIER:          float = 0.60
_CHILD_ACTIVITY_MULTIPLIER:      float = 0.50


# ── Public API ─────────────────────────────────────────────────────────────────

def compute_cost_range(
    tier: BudgetTier,
    duration_days: int,
    adults: int = 1,
    children: int = 0,
    is_same_city: bool = False,
    jitter: float = 0.0,
    max_budget: int | None = None,
) -> str:
    """
    Compute a human-readable total-group cost range string.

    Args:
        tier:          Budget tier ('budget', 'moderate', 'luxury').
        duration_days: Number of trip days.
        adults:        Number of adult travellers (full rate). Default 1.
        children:      Number of child travellers (discounted rate). Default 0.
        is_same_city:  If True, applies lower local transport cost.
        jitter:        Float in [-0.08, 0.08] applied to base_cost for refresh variance.
        max_budget:    Optional user-selected maximum (INR). When provided, max_cost is
                       clamped to this value (soft upper-bound). None = system default.

    Returns:
        Formatted string like "₹9,000 - ₹14,000" representing total group cost.

    Backward compat:
        adults=1, children=0  →  identical to the original single-traveller result.
    """
    # Resolve effective transport daily (same-city override applies before child multiplier)
    transport_daily = (
        _SAME_CITY_TRANSPORT_DAILY[tier] if is_same_city else _TRANSPORT_DAILY[tier]
    )
    accommodation_daily = _ACCOMMODATION_DAILY[tier]
    food_daily          = _FOOD_DAILY[tier]
    activity_flat       = _ACTIVITY_FLATS[tier]

    # ── Adult cost ──────────────────────────────────────────────────────────
    adult_daily = transport_daily + accommodation_daily + food_daily
    adult_total = adult_daily * adults * duration_days

    # ── Child cost ──────────────────────────────────────────────────────────
    child_daily = (
        transport_daily     * _CHILD_TRANSPORT_MULTIPLIER
        + accommodation_daily * _CHILD_ACCOMMODATION_MULTIPLIER
        + food_daily          * _CHILD_FOOD_MULTIPLIER
    )
    child_total = child_daily * children * duration_days

    # ── Activity cost ────────────────────────────────────────────────────────
    # Adults: full flat fee once per group
    # Children: 0.50× of flat, per child (additive)
    activity_cost = activity_flat + (activity_flat * _CHILD_ACTIVITY_MULTIPLIER * children)

    # ── Total base cost ──────────────────────────────────────────────────────
    base_cost = adult_total + child_total + activity_cost

    # Apply refresh jitter to total group cost
    if jitter != 0.0:
        base_cost = base_cost * (1 + jitter)

    # Round to nearest ₹100
    min_cost = _round_to_hundred(base_cost * 0.90)
    max_cost = _round_to_hundred(base_cost * 1.15)

    # Safety floor
    min_cost = max(min_cost, 500)
    max_cost = max(max_cost, min_cost + 500)

    # User-selected cap: hard-clamp both min and max to the user's budget window.
    # Case 1: max_cost > max_budget → clamp max_cost down.
    # Case 2: min_cost > max_budget as well (traveller count pushes it over) →
    #         squeeze range to [max_budget*0.9, max_budget] so the range stays valid.
    if max_budget is not None:
        if min_cost > max_budget:
            # Computed minimum already exceeds user cap — squeeze both bounds
            max_cost = max_budget
            min_cost = _round_to_hundred(max_budget * 0.9)
            min_cost = max(min_cost, 500)             # absolute floor
        else:
            max_cost = min(max_cost, max_budget)
            max_cost = max(max_cost, min_cost + 500)  # preserve ≥500 spread

    return f"₹{min_cost:,} - ₹{max_cost:,}"


def compute_refresh_jitter() -> float:
    """
    Returns a random jitter value in [-0.05, 0.05] for refresh simulation.
    Clamped to ±8% max cumulative drift (enforced by caller).
    """
    return random.uniform(-0.05, 0.05)


# ── Private helpers ────────────────────────────────────────────────────────────

def _round_to_hundred(value: float) -> int:
    """Round a float to the nearest 100."""
    return int(round(value / 100) * 100)
