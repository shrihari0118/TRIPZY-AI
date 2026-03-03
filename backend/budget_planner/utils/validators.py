"""
validators.py
Business-level validation helpers for TripRequest and RefreshRequest.
Pydantic handles field-level validation; this module handles cross-field
and semantic rules that produce specific API error codes.
"""
from __future__ import annotations
from datetime import date


class BudgetValidationError(Exception):
    """Raised when a business validation rule is violated."""
    def __init__(self, code: str, message: str, details: dict | None = None):
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(message)


def validate_trip_request(
    start_place: str,
    destination_place: str,
    start_date: date,
    end_date: date,
) -> None:
    """
    Run semantic validation on trip request fields.
    Raises BudgetValidationError with a specific error code on failure.

    Note: Pydantic already enforces min_length=1 and date parsing.
    This layer catches edge cases that Pydantic cannot express.
    """
    # Non-empty after stripping whitespace
    if not start_place.strip():
        raise BudgetValidationError(
            code="EMPTY_LOCATION",
            message="startPlace must not be blank.",
        )
    if not destination_place.strip():
        raise BudgetValidationError(
            code="EMPTY_LOCATION",
            message="destinationPlace must not be blank.",
        )

    # Date ordering (also enforced by model_validator, but explicit here for clarity)
    if start_date >= end_date:
        raise BudgetValidationError(
            code="INVALID_DATE_RANGE",
            message="startDate must be strictly before endDate.",
            details={"startDate": str(start_date), "endDate": str(end_date)},
        )
