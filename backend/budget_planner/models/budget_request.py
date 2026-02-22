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

# Per-tier allowed max-budget limits (INR) — mirrors TIER_LIMITS in BudgetForm.tsx
_TIER_MIN_LIMITS: dict[str, int] = {"budget": 3_000,  "moderate": 8_000,  "luxury": 20_000}
_TIER_MAX_LIMITS: dict[str, int] = {"budget": 5_000,  "moderate": 15_000, "luxury": 50_000}


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
        """If maxBudget is provided, ensure it falls within the selected tier's allowed range."""
        if self.maxBudget is None:
            return self
        tier = str(self.budgetRange)
        lo = _TIER_MIN_LIMITS[tier]
        hi = _TIER_MAX_LIMITS[tier]
        if not (lo <= self.maxBudget <= hi):
            raise ValueError(
                f"maxBudget ₹{self.maxBudget:,} is outside the allowed range for "
                f"the '{tier}' tier (₹{lo:,} – ₹{hi:,})."
            )
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
        """If maxBudget is provided, ensure it falls within the selected tier's allowed range."""
        if self.maxBudget is None:
            return self
        tier = str(self.budgetRange)
        lo = _TIER_MIN_LIMITS[tier]
        hi = _TIER_MAX_LIMITS[tier]
        if not (lo <= self.maxBudget <= hi):
            raise ValueError(
                f"maxBudget ₹{self.maxBudget:,} is outside the allowed range for "
                f"the '{tier}' tier (₹{lo:,} – ₹{hi:,})."
            )
        return self
