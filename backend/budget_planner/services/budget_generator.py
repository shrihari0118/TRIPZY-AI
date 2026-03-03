"""
budget_generator.py
Core rule engine service for the Budget Planner AI module.

Implements:
  - generate(trip_request) → BudgetGenerateResponse
  - refresh(refresh_request, original_cost_bases) → BudgetRefreshResponse

Rule engine spec: Step 3 / Step B design documents.
API contracts: Step 2 — response shape must NOT change.
Step B: adults + children are read from TripRequest/RefreshRequest and passed
        into cost calculation. No other composition logic changes.
"""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from budget_planner.models.budget_entities import BudgetPlan, BudgetTier, PlanOptions, TripSummary
from budget_planner.models.budget_request import RefreshRequest, TripRequest
from budget_planner.models.budget_response import BudgetGenerateResponse, BudgetRefreshResponse
from budget_planner.providers.base_provider import BasePlanProvider
from budget_planner.providers.mock_provider import MockPlanProvider
from budget_planner.utils.cost_calculator import compute_cost_range, compute_refresh_jitter
from budget_planner.utils.date_utils import TripMeta, derive_trip_meta

# ── Provider Selection ─────────────────────────────────────────────────────────
# To switch to the real provider, change this import and instantiation.
# No other code needs to change.
ACTIVE_PROVIDER: BasePlanProvider = MockPlanProvider()

# Fixed tier order — frontend expects exactly this order
_TIERS: list[BudgetTier] = ["budget", "moderate", "luxury"]


# ── Public API ─────────────────────────────────────────────────────────────────

def generate(trip_request: TripRequest, request_id: UUID) -> BudgetGenerateResponse:
    """
    Generate three budget plans for the given trip request.
    Implements the full rule engine from Step 3 / Step B.

    Args:
        trip_request: Validated TripRequest from the controller.
        request_id:   Pre-generated UUID (created by controller, stored in DB).

    Returns:
        BudgetGenerateResponse with exactly 3 plans.
    """
    meta = derive_trip_meta(
        start_place=trip_request.startPlace,
        destination_place=trip_request.destinationPlace,
        start_date=trip_request.startDate,
        end_date=trip_request.endDate,
    )

    plans = [
        _compose_plan(
            tier=tier,
            meta=meta,
            adults=trip_request.adults,
            children=trip_request.children,
            jitter=0.0,
            # Apply the user's max-budget cap only to the tier they selected
            max_budget=trip_request.maxBudget if tier == trip_request.budgetRange else None,
        )
        for tier in _TIERS
    ]
    _assert_response_invariants(plans)

    trip_summary = _build_trip_summary(trip_request, meta)

    return BudgetGenerateResponse(
        requestId=request_id,
        lastUpdatedAt=datetime.now(timezone.utc),
        trip_summary=trip_summary,
        plans=plans,
    )


def refresh(
    refresh_request: RefreshRequest,
    original_cost_bases: dict[str, float] | None = None,
) -> BudgetRefreshResponse:
    """
    Re-generate plans with a small cost jitter to simulate live availability refresh.
    Stable fields (titles, options, structure) are never changed.
    Jitter applies to the total group cost (adults + discounted children).

    Args:
        refresh_request:    Validated RefreshRequest from the controller.
        original_cost_bases: Optional dict of {tier: original_base_cost} for drift clamping.
                             If None, jitter is applied without drift clamping.

    Returns:
        BudgetRefreshResponse with updated costRange and lastUpdatedAt.
    """
    meta = derive_trip_meta(
        start_place=refresh_request.startPlace,
        destination_place=refresh_request.destinationPlace,
        start_date=refresh_request.startDate,
        end_date=refresh_request.endDate,
    )

    plans = [
        _compose_plan(
            tier=tier,
            meta=meta,
            adults=refresh_request.adults,
            children=refresh_request.children,
            jitter=compute_refresh_jitter(),
            # Apply the user's max-budget cap only to the selected tier
            max_budget=refresh_request.maxBudget if tier == refresh_request.budgetRange else None,
        )
        for tier in _TIERS
    ]
    _assert_response_invariants(plans)

    trip_summary = _build_trip_summary(refresh_request, meta)

    return BudgetRefreshResponse(
        requestId=refresh_request.requestId,
        lastUpdatedAt=datetime.now(timezone.utc),
        trip_summary=trip_summary,
        plans=plans,
    )


# ── Private Helpers ────────────────────────────────────────────────────────────

def _compose_plan(
    tier: BudgetTier,
    meta: TripMeta,
    adults: int,
    children: int,
    jitter: float,
    max_budget: int | None = None,
) -> BudgetPlan:
    """
    Compose a single BudgetPlan for the given tier using provider data and rule engine logic.
    adults and children are forwarded to cost calculation only; no other composition changes.
    """
    provider = ACTIVE_PROVIDER

    # Options arrays (all must be non-empty)
    transport_options     = provider.get_transport_options(tier, meta.is_same_city)
    accommodation_options = provider.get_accommodation_options(tier, meta.is_long_trip)
    food_options          = provider.get_food_options(tier)
    activity_options      = provider.get_activity_options(tier, meta.is_short_trip, meta.is_long_trip)

    # Defaults: always the first item in the options array
    # This guarantees: plan.X ∈ plan.options.X
    default_transport     = transport_options[0]
    default_accommodation = accommodation_options[0]
    default_food          = food_options[0]

    # Activities shown on card: first 4 (or first 2 for short trips)
    activity_card_count  = 2 if meta.is_short_trip else 4
    default_activities   = activity_options[:activity_card_count]

    # Spots: single summary string, not user-selectable
    spots = provider.get_spots(tier, meta.is_same_city)

    # Cost range: total group cost scaled by adults + discounted children
    cost_range = compute_cost_range(
        tier=tier,
        duration_days=meta.duration_days,
        adults=adults,
        children=children,
        is_same_city=meta.is_same_city,
        jitter=jitter,
        max_budget=max_budget,
    )

    return BudgetPlan(
        id=tier,
        title=provider.get_plan_title(tier),
        description=provider.get_plan_description(tier),
        costRange=cost_range,
        transport=default_transport,
        accommodation=default_accommodation,
        food=default_food,
        spots=spots,
        activities=default_activities,
        options=PlanOptions(
            transport=transport_options,
            accommodation=accommodation_options,
            food=food_options,
            activities=activity_options,
        ),
    )


def _build_trip_summary(
    request: TripRequest | RefreshRequest,
    meta: TripMeta,
) -> TripSummary:
    """Build the TripSummary echoed back in every response, including adults/children."""
    return TripSummary(
        startPlace=request.startPlace,
        destinationPlace=request.destinationPlace,
        startDate=meta.start_date_str,
        endDate=meta.end_date_str,
        durationDays=meta.duration_days,
        selectedBudgetRange=request.budgetRange,
        adults=request.adults,
        children=request.children,
    )


def _assert_response_invariants(plans: list[BudgetPlan]) -> None:
    """
    Assert all structural invariants before returning a response.
    Raises AssertionError if any invariant is violated — catches bugs early.
    """
    assert len(plans) == 3, f"Expected 3 plans, got {len(plans)}"
    assert [p.id for p in plans] == ["budget", "moderate", "luxury"], \
        "Plans must be ordered: budget, moderate, luxury"

    for plan in plans:
        assert plan.transport in plan.options.transport, \
            f"[{plan.id}] default transport not in options"
        assert plan.accommodation in plan.options.accommodation, \
            f"[{plan.id}] default accommodation not in options"
        assert plan.food in plan.options.food, \
            f"[{plan.id}] default food not in options"
        assert all(a in plan.options.activities for a in plan.activities), \
            f"[{plan.id}] some default activities not in options"
        assert len(plan.options.transport) >= 1
        assert len(plan.options.accommodation) >= 1
        assert len(plan.options.food) >= 1
        assert len(plan.options.activities) >= 1
        assert len(plan.activities) >= 1
