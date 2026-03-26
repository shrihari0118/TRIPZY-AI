"""
budget_request.py
Pydantic request models for POST /v1/budget/generate and POST /v1/budget/refresh.
Validation rules from Step 2 API contracts are enforced here.
Step A: adults + children fields added (backward-compatible; both optional with safe defaults).
"""
from __future__ import annotations

from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from budget_planner.models.budget_entities import BudgetTier

_MAX_TRAVELLERS = 10

# NOTE: Hardcoded _TIER_MIN_LIMITS and _TIER_MAX_LIMITS have been removed.
# Budget ranges are now derived dynamically from the transport_datas collection
# via GET /v1/budget/range.  The maxBudget field is still validated as a
# positive integer; route-specific bounds are enforced by the frontend slider.


class TripRequest(BaseModel):
    """
    Request body for POST /v1/budget/generate.
    Maps directly to BudgetFormValues from the frontend BudgetForm component.
    """
    # ── Existing fields — DO NOT RENAME ─────────────────────────────────────
    startPlace:       str       = Field(..., min_length=1, description="Origin city or location")
    destinationPlace: str       = Field(..., min_length=1, description="Destination city or location")
    startDate:        date      = Field(..., description="Trip start date (YYYY-MM-DD)")
    endDate:          date      = Field(..., description="Trip end date (YYYY-MM-DD)")
    budgetRange:      BudgetTier = Field(..., description="User's preferred budget tier")

    # ── New optional traveller fields (Step A) ───────────────────────────────
    adults: int = Field(
        default=1,
        ge=1,
        description="Number of adult travellers (≥ 1). Omit to default to 1.",
    )
    children: int = Field(
        default=0,
        ge=0,
        description="Number of child travellers (≥ 0). Omit to default to 0.",
    )

    # ── Optional max-budget cap (this feature) ────────────────────────────────
    maxBudget: int | None = Field(
        default=None,
        description=(
            "User-selected maximum budget cap (INR). Optional. "
            "If provided, must be within the tier's allowed range. "
            "Omit to use system-computed default."
        ),
    )

    @model_validator(mode="after")
    def validate_date_order(self) -> "TripRequest":
        """Ensure startDate is strictly before endDate."""
        if self.startDate >= self.endDate:
            raise ValueError("startDate must be strictly before endDate")
        return self

    @model_validator(mode="after")
    def validate_total_travellers(self) -> "TripRequest":
        """Enforce combined traveller cap."""
        if self.adults + self.children > _MAX_TRAVELLERS:
            raise ValueError(
                f"Total travellers (adults + children) must not exceed {_MAX_TRAVELLERS}. "
                f"Received adults={self.adults}, children={self.children}."
            )
        return self

    @model_validator(mode="after")
    def validate_max_budget(self) -> "TripRequest":
        """If maxBudget is provided, ensure it is a positive number."""
        if self.maxBudget is not None and self.maxBudget <= 0:
            raise ValueError("maxBudget must be a positive number.")
        return self


class RefreshRequest(BaseModel):
    """
    Request body for POST /v1/budget/refresh.
    Carries the original TripRequest fields plus the requestId from /generate.
    """
    # ── Existing fields — DO NOT RENAME ─────────────────────────────────────
    requestId:        UUID      = Field(..., description="UUID returned by the original /generate call")
    startPlace:       str       = Field(..., min_length=1)
    destinationPlace: str       = Field(..., min_length=1)
    startDate:        date      = Field(..., description="Trip start date (YYYY-MM-DD)")
    endDate:          date      = Field(..., description="Trip end date (YYYY-MM-DD)")
    budgetRange:      BudgetTier

    # ── New optional traveller fields (Step A) ───────────────────────────────
    adults: int = Field(
        default=1,
        ge=1,
        description="Number of adult travellers (≥ 1). Omit to default to 1.",
    )
    children: int = Field(
        default=0,
        ge=0,
        description="Number of child travellers (≥ 0). Omit to default to 0.",
    )

    # ── Optional max-budget cap (this feature) ────────────────────────────────
    maxBudget: int | None = Field(
        default=None,
        description=(
            "User-selected maximum budget cap (INR). Optional. "
            "If provided, must be within the tier's allowed range."
        ),
    )

    @model_validator(mode="after")
    def validate_date_order(self) -> "RefreshRequest":
        """Ensure startDate is strictly before endDate."""
        if self.startDate >= self.endDate:
            raise ValueError("startDate must be strictly before endDate")
        return self

    @model_validator(mode="after")
    def validate_total_travellers(self) -> "RefreshRequest":
        """Enforce combined traveller cap."""
        if self.adults + self.children > _MAX_TRAVELLERS:
            raise ValueError(
                f"Total travellers (adults + children) must not exceed {_MAX_TRAVELLERS}. "
                f"Received adults={self.adults}, children={self.children}."
            )
        return self

    @model_validator(mode="after")
    def validate_max_budget(self) -> "RefreshRequest":
        """If maxBudget is provided, ensure it is a positive number."""
        if self.maxBudget is not None and self.maxBudget <= 0:
            raise ValueError("maxBudget must be a positive number.")
        return self
