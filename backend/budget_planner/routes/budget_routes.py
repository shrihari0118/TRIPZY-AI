"""
budget_routes.py
FastAPI router for the Budget Planner module.
Registers: POST /generate and POST /refresh
Mounted at /v1/budget in main.py.
"""
from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from budget_planner.controllers import budget_controller
from budget_planner.models.budget_request import RefreshRequest, TripRequest
from budget_planner.models.budget_response import (
    BudgetGenerateResponse,
    BudgetRefreshResponse,
    ErrorResponse,
)

router = APIRouter()


@router.post(
    "/generate",
    response_model=BudgetGenerateResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error (date range, empty location, invalid tier)"},
        500: {"model": ErrorResponse, "description": "Internal generation error"},
    },
    summary="Generate budget plans",
    description=(
        "Generate three budget plans (budget / moderate / luxury) for a trip. "
        "Returns plans with costRange, transport, accommodation, food, spots, "
        "activities, and options arrays for the PersonalizeModal."
    ),
)
def generate_budget(trip_request: TripRequest) -> BudgetGenerateResponse:
    """
    POST /v1/budget/generate

    Accepts trip parameters and returns exactly 3 budget plans.
    The response shape matches the frontend BudgetPlan TypeScript type exactly.
    """
    return budget_controller.handle_generate(trip_request)


@router.post(
    "/refresh",
    response_model=BudgetRefreshResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error"},
        404: {"model": ErrorResponse, "description": "requestId not found"},
        500: {"model": ErrorResponse, "description": "Internal refresh error"},
    },
    summary="Refresh budget plan availability",
    description=(
        "Re-fetch plans for an existing requestId with a small cost variance "
        "to simulate live availability changes. Stable fields (titles, options) "
        "are never changed. Only costRange and lastUpdatedAt are updated."
    ),
)
def refresh_budget(refresh_request: RefreshRequest) -> BudgetRefreshResponse:
    """
    POST /v1/budget/refresh

    Accepts the original requestId + trip filters and returns refreshed plans.
    """
    return budget_controller.handle_refresh(refresh_request)
