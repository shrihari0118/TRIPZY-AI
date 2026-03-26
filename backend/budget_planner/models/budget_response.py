"""
budget_response.py
Pydantic response models for POST /v1/budget/generate and POST /v1/budget/refresh.
Response shapes are locked — do NOT change field names or nesting.
"""
from __future__ import annotations
from datetime import datetime, timezone
from uuid import UUID, uuid4
from pydantic import BaseModel, Field
from budget_planner.models.budget_entities import BudgetPlan, BudgetTier, TripSummary


class BudgetGenerateResponse(BaseModel):
    """
    Response envelope for POST /v1/budget/generate.
    plans always contains exactly 3 items ordered: budget, moderate, luxury.
    """
    requestId: UUID = Field(default_factory=uuid4)
    lastUpdatedAt: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    trip_summary: TripSummary
    plans: list[BudgetPlan] = Field(..., min_length=3, max_length=3)


class BudgetRefreshResponse(BaseModel):
    """
    Response envelope for POST /v1/budget/refresh.
    Same shape as BudgetGenerateResponse; lastUpdatedAt reflects the refresh time.
    """
    requestId: UUID
    lastUpdatedAt: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    trip_summary: TripSummary
    plans: list[BudgetPlan] = Field(..., min_length=3, max_length=3)


# ── Error Models ───────────────────────────────────────────────────────────────


# ── Budget Range Models ────────────────────────────────────────────────────────

class SliderRange(BaseModel):
    min: int
    max: int


class BudgetRangeResponse(BaseModel):
    """Legacy response for single-tier range queries."""
    budget_category: str
    slider_range: SliderRange


class BudgetRangesResponse(BaseModel):
    """Response for GET /v1/budget/range — all 3 tiers at once."""
    budget_ranges: dict[str, SliderRange]


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    error: ErrorDetail
