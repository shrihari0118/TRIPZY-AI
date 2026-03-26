"""
budget_generator.py
Core rule engine service for the Budget Planner AI module.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from uuid import UUID

from budget_planner.models.budget_entities import (
    BudgetPlan,
    BudgetTier,
    PlanOptions,
    TransportOption,
    TripSummary,
)
from budget_planner.models.budget_request import RefreshRequest, TripRequest
from budget_planner.models.budget_response import BudgetGenerateResponse, BudgetRefreshResponse
from budget_planner.providers.base_provider import BasePlanProvider
from budget_planner.providers.mock_provider import MockPlanProvider
from budget_planner.providers.mongodb_provider import MongoDBPlanProvider
from budget_planner.services.airport_mapper import get_airport_code
from budget_planner.services.flight_service import FlightSelection, get_best_flight
from budget_planner.utils.cost_calculator import compute_cost_range, compute_refresh_jitter
from budget_planner.utils.date_utils import TripMeta, derive_trip_meta

# ── Active provider: swap between MongoDBPlanProvider (production) and
#    MockPlanProvider (development / CI / fallback). ─────────────────────────────
ACTIVE_PROVIDER: BasePlanProvider = MongoDBPlanProvider()
_FALLBACK_PROVIDER: BasePlanProvider = MockPlanProvider()
_TIERS: list[BudgetTier] = ["budget", "moderate", "luxury"]

_TRANSPORT_RATIOS: dict[BudgetTier, float] = {
    "budget": 0.25,
    "moderate": 0.20,
    "luxury": 0.15,
}


def generate(trip_request: TripRequest, request_id: UUID) -> BudgetGenerateResponse:
    meta = derive_trip_meta(
        start_place=trip_request.startPlace,
        destination_place=trip_request.destinationPlace,
        start_date=trip_request.startDate,
        end_date=trip_request.endDate,
    )

    origin_iata = get_airport_code(trip_request.startPlace)
    destination_iata = get_airport_code(trip_request.destinationPlace)

    plans = [
        _compose_plan(
            tier=tier,
            meta=meta,
            adults=trip_request.adults,
            children=trip_request.children,
            jitter=0.0,
            max_budget=trip_request.maxBudget if tier == trip_request.budgetRange else None,
            origin_iata=origin_iata,
            destination_iata=destination_iata,
            travel_date=meta.start_date_str,
            source_city=trip_request.startPlace,
            destination_city=trip_request.destinationPlace,
        )
        for tier in _TIERS
    ]
    _assert_response_invariants(plans)

    return BudgetGenerateResponse(
        requestId=request_id,
        lastUpdatedAt=datetime.now(timezone.utc),
        trip_summary=_build_trip_summary(trip_request, meta),
        plans=plans,
    )


def refresh(
    refresh_request: RefreshRequest,
    original_cost_bases: dict[str, float] | None = None,
) -> BudgetRefreshResponse:
    meta = derive_trip_meta(
        start_place=refresh_request.startPlace,
        destination_place=refresh_request.destinationPlace,
        start_date=refresh_request.startDate,
        end_date=refresh_request.endDate,
    )

    origin_iata = get_airport_code(refresh_request.startPlace)
    destination_iata = get_airport_code(refresh_request.destinationPlace)

    plans = [
        _compose_plan(
            tier=tier,
            meta=meta,
            adults=refresh_request.adults,
            children=refresh_request.children,
            jitter=compute_refresh_jitter(),
            max_budget=refresh_request.maxBudget if tier == refresh_request.budgetRange else None,
            origin_iata=origin_iata,
            destination_iata=destination_iata,
            travel_date=meta.start_date_str,
            source_city=refresh_request.startPlace,
            destination_city=refresh_request.destinationPlace,
        )
        for tier in _TIERS
    ]
    _assert_response_invariants(plans)

    return BudgetRefreshResponse(
        requestId=refresh_request.requestId,
        lastUpdatedAt=datetime.now(timezone.utc),
        trip_summary=_build_trip_summary(refresh_request, meta),
        plans=plans,
    )


def _compose_plan(
    tier: BudgetTier,
    meta: TripMeta,
    adults: int,
    children: int,
    jitter: float,
    max_budget: int | None,
    origin_iata: str | None,
    destination_iata: str | None,
    travel_date: str,
    source_city: str = "",
    destination_city: str = "",
) -> BudgetPlan:
    provider = ACTIVE_PROVIDER
    fallback = _FALLBACK_PROVIDER

    # Compute a category budget limit for provider queries
    cost_range = compute_cost_range(
        tier=tier,
        duration_days=meta.duration_days,
        adults=adults,
        children=children,
        is_same_city=meta.is_same_city,
        jitter=jitter,
        max_budget=max_budget,
    )
    total_budget = _resolve_total_budget(cost_range, max_budget)
    transport_budget = int(total_budget * _TRANSPORT_RATIOS[tier])

    # ── Fetch options from MongoDB (with MockProvider fallback) ────────────
    static_transport_labels = provider.get_transport_options(
        tier, meta.is_same_city,
        source_city=source_city,
        destination_city=destination_city,
        budget_limit=transport_budget,
    )
    if not static_transport_labels:
        static_transport_labels = fallback.get_transport_options(tier, meta.is_same_city)

    static_transport_options = [
        _label_to_transport_option(label, origin_iata, destination_iata)
        for label in static_transport_labels
    ]

    accommodation_options = provider.get_accommodation_options(
        tier, meta.is_long_trip,
        destination_city=destination_city,
        budget_limit=total_budget,
    )
    if not accommodation_options:
        accommodation_options = fallback.get_accommodation_options(tier, meta.is_long_trip)

    food_options = provider.get_food_options(
        tier,
        destination_city=destination_city,
        budget_limit=total_budget,
    )
    if not food_options:
        food_options = fallback.get_food_options(tier)

    activity_options = provider.get_activity_options(
        tier, meta.is_short_trip, meta.is_long_trip,
        destination_city=destination_city,
        budget_limit=total_budget,
    )
    if not activity_options:
        activity_options = fallback.get_activity_options(tier, meta.is_short_trip, meta.is_long_trip)

    spots = provider.get_spots(
        tier, meta.is_same_city,
        destination_city=destination_city,
        budget_limit=total_budget,
    )
    if not spots:
        spots = fallback.get_spots(tier, meta.is_same_city)

    # ── Flight integration (unchanged) ────────────────────────────────────
    best_flight = _get_tier_flight(
        tier=tier,
        is_same_city=meta.is_same_city,
        origin_iata=origin_iata,
        destination_iata=destination_iata,
        travel_date=travel_date,
        transport_budget=transport_budget,
    )

    fallback_no_flight: TransportOption | None = None
    options_transport: list[TransportOption] = list(static_transport_options)
    flight_option: TransportOption | None = None
    if best_flight:
        flight_option = _flight_to_transport_option(best_flight)
        options_transport = [flight_option, *options_transport]
    elif tier == "luxury":
        fallback_no_flight = TransportOption(
            type="flight",
            name="No flight found within budget",
            route=_build_route(origin_iata, destination_iata),
            departure="",
            arrival="",
            price=0,
        )
        options_transport = [fallback_no_flight, *options_transport]

    options_transport = _merge_transport_options(options_transport)
    if not options_transport:
        options_transport = [
            TransportOption(type="other", name="Transport not available", route="", departure="", arrival="", price=0)
        ]

    default_transport = _select_default_transport(
        tier=tier,
        transport_options=options_transport,
        flight_option=flight_option,
        fallback_no_flight=fallback_no_flight,
    )

    default_accommodation = accommodation_options[0]
    default_food = food_options[0]
    activity_card_count = 2 if meta.is_short_trip else 4
    default_activities = activity_options[:activity_card_count]

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
            transport=options_transport,
            accommodation=accommodation_options,
            food=food_options,
            activities=activity_options,
        ),
    )


def _get_tier_flight(
    tier: BudgetTier,
    is_same_city: bool,
    origin_iata: str | None,
    destination_iata: str | None,
    travel_date: str,
    transport_budget: int,
) -> FlightSelection | None:
    if tier not in {"moderate", "luxury"}:
        return None
    if is_same_city or not origin_iata or not destination_iata:
        return None
    return get_best_flight(
        dep_iata=origin_iata,
        arr_iata=destination_iata,
        date=travel_date,
        max_budget=transport_budget,
    )


def _select_default_transport(
    tier: BudgetTier,
    transport_options: list[TransportOption],
    flight_option: TransportOption | None,
    fallback_no_flight: TransportOption | None,
) -> TransportOption:
    if tier == "luxury":
        if flight_option is not None:
            return flight_option
        if fallback_no_flight is not None:
            return fallback_no_flight
        return transport_options[0]

    if tier == "moderate":
        if flight_option is not None:
            return flight_option
        preferred = _pick_by_type(transport_options, {"train", "bus"})
        return preferred or transport_options[0]

    preferred = _pick_by_type(transport_options, {"bus", "train"})
    return preferred or transport_options[0]


def _pick_by_type(
    options: list[TransportOption],
    allowed_types: set[str],
) -> TransportOption | None:
    for option in options:
        if option.type in allowed_types:
            return option
    return None


def _label_to_transport_option(
    label: str,
    origin_iata: str | None,
    destination_iata: str | None,
) -> TransportOption:
    transport_type = _infer_transport_type(label)
    return TransportOption(
        type=transport_type,
        name=label,
        route=_build_route(origin_iata, destination_iata),
        departure="",
        arrival="",
        price=0,
    )


def _flight_to_transport_option(flight: FlightSelection) -> TransportOption:
    return TransportOption(
        type="flight",
        name=f"Flight - {flight['name']}",
        route=flight["route"],
        departure=flight["departure"],
        arrival=flight["arrival"],
        price=flight["price"],
    )


def _infer_transport_type(label: str) -> str:
    value = (label or "").strip().lower()
    if "flight" in value:
        return "flight"
    if (
        "train" in value
        or "chair car" in value
        or "3a" in value
        or "2s" in value
        or "cabin" in value
    ):
        return "train"
    if "bus" in value:
        return "bus"
    return "other"


def _build_route(origin_iata: str | None, destination_iata: str | None) -> str:
    if origin_iata and destination_iata:
        return f"{origin_iata} \u2192 {destination_iata}"
    return ""


def _resolve_total_budget(cost_range: str, max_budget: int | None) -> int:
    if max_budget is not None:
        return max_budget

    values = [int(token) for token in re.findall(r"\d+", cost_range.replace(",", ""))]
    if len(values) >= 2:
        return values[-1]
    if len(values) == 1:
        return values[0]
    return 0


def _merge_transport_options(options: list[TransportOption]) -> list[TransportOption]:
    merged: list[TransportOption] = []
    seen: set[str] = set()
    for option in options:
        key = option.name.strip().lower()
        if key in seen:
            continue
        seen.add(key)
        merged.append(option)
    return merged


def _build_trip_summary(
    request: TripRequest | RefreshRequest,
    meta: TripMeta,
) -> TripSummary:
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
    assert len(plans) == 3, f"Expected 3 plans, got {len(plans)}"
    assert [p.id for p in plans] == ["budget", "moderate", "luxury"], (
        "Plans must be ordered: budget, moderate, luxury"
    )

    for plan in plans:
        transport_names = [option.name for option in plan.options.transport]
        assert plan.transport.name in transport_names, (
            f"[{plan.id}] default transport not in options"
        )
        assert plan.accommodation in plan.options.accommodation, (
            f"[{plan.id}] default accommodation not in options"
        )
        assert plan.food in plan.options.food, (
            f"[{plan.id}] default food not in options"
        )
        assert all(activity in plan.options.activities for activity in plan.activities), (
            f"[{plan.id}] some default activities not in options"
        )
        assert len(plan.options.transport) >= 1
        assert len(plan.options.accommodation) >= 1
        assert len(plan.options.food) >= 1
        assert len(plan.options.activities) >= 1
        assert len(plan.activities) >= 1

