"""
budget_entities.py
Core domain entities for the Budget Planner module.
These types mirror the frontend BudgetPlan type in src/data/budgetPlans.ts exactly.
Field names and nesting must NOT be changed.
Step A: adults and children echoed in TripSummary.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# ── Tier Enum ──────────────────────────────────────────────────────────────────

BudgetTier = Literal["budget", "moderate", "luxury"]


# ── Sub-models ─────────────────────────────────────────────────────────────────

class PlanOptions(BaseModel):
    """
    Available options shown in the frontend PersonalizeModal.
    Mirrors: plan.options.{transport, accommodation, food, activities}
    """
    transport:     list[str] = Field(..., min_length=1)
    accommodation: list[str] = Field(..., min_length=1)
    food:          list[str] = Field(..., min_length=1)
    activities:    list[str] = Field(..., min_length=1)


class BudgetPlan(BaseModel):
    """
    Canonical plan object consumed by BudgetCard and PersonalizeModal.
    Every field name here maps 1:1 to the frontend BudgetPlan TypeScript type.
    Shape is LOCKED — do not add, remove, or rename fields.
    """
    id:            BudgetTier
    title:         str
    description:   str
    costRange:     str          # e.g. "₹9,000 - ₹14,000"  (total group cost)
    transport:     str          # Default/recommended transport (shown on card)
    accommodation: str          # Default/recommended accommodation
    food:          str          # Default/recommended food style
    spots:         str          # Tourist spots summary string (not an array)
    activities:    list[str]    # Default selected activities (card shows first 4)
    options:       PlanOptions  # Full option lists for PersonalizeModal


class TripSummary(BaseModel):
    """
    Trip metadata echoed back in every response.
    Step A: adults and children are echoed so callers can confirm the values used.
    """
    # ── Existing fields — DO NOT RENAME ─────────────────────────────────────
    startPlace:          str
    destinationPlace:    str
    startDate:           str        # "YYYY-MM-DD"
    endDate:             str        # "YYYY-MM-DD"
    durationDays:        int
    selectedBudgetRange: BudgetTier

    # ── New echo fields (Step A) ─────────────────────────────────────────────
    adults:   int = Field(default=1, description="Adult travellers used for cost scaling.")
    children: int = Field(default=0, description="Child travellers used for cost scaling.")
