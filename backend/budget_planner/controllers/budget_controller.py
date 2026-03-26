"""
budget_controller.py
Orchestrates services and maps errors to the API error envelope.
The controller is the single point of error handling for the budget module.
"""
from __future__ import annotations
from uuid import uuid4

from fastapi import HTTPException
from pydantic import ValidationError

from budget_planner.models.budget_request import RefreshRequest, TripRequest
from budget_planner.models.budget_response import (
    BudgetGenerateResponse,
    BudgetRangeResponse,
    BudgetRangesResponse,
    BudgetRefreshResponse,
    ErrorDetail,
    ErrorResponse,
    SliderRange,
)
from budget_planner.repository import budget_repository
from budget_planner.services import budget_generator
from budget_planner.services.budget_engine import calculate_budget_ranges
from budget_planner.utils.validators import BudgetValidationError, validate_trip_request


def handle_range(
    source_city: str,
    destination_city: str,
    days: int,
) -> BudgetRangesResponse:
    """
    Compute total trip budget ranges for all 3 tiers using the Dynamic
    Budget Engine (transport + accommodation + food + activity + spots).
    """
    if days < 1:
        raise HTTPException(
            status_code=400,
            detail=ErrorResponse(
                error=ErrorDetail(
                    code="INVALID_DAYS",
                    message="days must be at least 1.",
                )
            ).model_dump(),
        )

    data = calculate_budget_ranges(source_city, destination_city, days)
    # Convert raw dicts to SliderRange models
    budget_ranges = {
        tier: SliderRange(min=vals["min"], max=vals["max"])
        for tier, vals in data["budget_ranges"].items()
    }
    return BudgetRangesResponse(budget_ranges=budget_ranges)


def handle_generate(trip_request: TripRequest) -> BudgetGenerateResponse:
    """
    Orchestrate the generate flow:
      1. Run semantic validation
      2. Generate plans via rule engine
      3. Persist to MongoDB
      4. Return response

    Raises HTTPException with structured error body on any failure.
    """
    # Step 1: Semantic validation (Pydantic already handled field-level)
    try:
        validate_trip_request(
            start_place=trip_request.startPlace,
            destination_place=trip_request.destinationPlace,
            start_date=trip_request.startDate,
            end_date=trip_request.endDate,
        )
    except BudgetValidationError as exc:
        raise HTTPException(
            status_code=400,
            detail=ErrorResponse(
                error=ErrorDetail(
                    code=exc.code,
                    message=exc.message,
                    details=exc.details,
                )
            ).model_dump(),
        )

    # NOTE: Hardcoded max-budget floor check has been removed.
    # Budget limits are now dynamically derived from GET /v1/budget/range.

    # Step 2: Generate plans
    request_id = uuid4()
    try:
        response = budget_generator.generate(trip_request, request_id)
    except AssertionError as exc:
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error=ErrorDetail(
                    code="GENERATION_FAILED",
                    message=f"Plan generation failed an invariant check: {exc}",
                )
            ).model_dump(),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error=ErrorDetail(
                    code="GENERATION_FAILED",
                    message="An unexpected error occurred during plan generation.",
                    details={"error": str(exc)},
                )
            ).model_dump(),
        )

    # Step 3: Persist to MongoDB
    try:
        budget_repository.save_request(
            request_id=request_id,
            trip_data={
                "startPlace": trip_request.startPlace,
                "destinationPlace": trip_request.destinationPlace,
                "startDate": trip_request.startDate.isoformat(),
                "endDate": trip_request.endDate.isoformat(),
                "budgetRange": trip_request.budgetRange,
            },
            plans_data=[plan.model_dump() for plan in response.plans],
        )
    except Exception:
        # Non-fatal: return the response even if persistence fails
        # Log this in production (add logging framework later)
        pass

    return response


def handle_refresh(refresh_request: RefreshRequest) -> BudgetRefreshResponse:
    """
    Orchestrate the refresh flow:
      1. Verify the requestId exists in MongoDB
      2. Run semantic validation
      3. Refresh plans via rule engine (with jitter)
      4. Update lastUpdatedAt in MongoDB
      5. Return response

    Raises HTTPException with structured error body on any failure.
    """
    # Step 1: Verify requestId exists
    existing = budget_repository.fetch_request(refresh_request.requestId)
    if existing is None:
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(
                error=ErrorDetail(
                    code="REQUEST_NOT_FOUND",
                    message=f"No budget request found for requestId: {refresh_request.requestId}",
                )
            ).model_dump(),
        )

    # Step 2: Semantic validation
    try:
        validate_trip_request(
            start_place=refresh_request.startPlace,
            destination_place=refresh_request.destinationPlace,
            start_date=refresh_request.startDate,
            end_date=refresh_request.endDate,
        )
    except BudgetValidationError as exc:
        raise HTTPException(
            status_code=400,
            detail=ErrorResponse(
                error=ErrorDetail(
                    code=exc.code,
                    message=exc.message,
                    details=exc.details,
                )
            ).model_dump(),
        )

    # NOTE: Hardcoded max-budget floor check has been removed.

    # Step 3: Refresh plans
    try:
        response = budget_generator.refresh(refresh_request)
    except AssertionError as exc:
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error=ErrorDetail(
                    code="REFRESH_FAILED",
                    message=f"Plan refresh failed an invariant check: {exc}",
                )
            ).model_dump(),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error=ErrorDetail(
                    code="REFRESH_FAILED",
                    message="An unexpected error occurred during plan refresh.",
                    details={"error": str(exc)},
                )
            ).model_dump(),
        )

    # Step 4: Update timestamp in MongoDB
    try:
        budget_repository.update_last_refreshed(refresh_request.requestId)
    except Exception:
        pass  # Non-fatal

    return response
