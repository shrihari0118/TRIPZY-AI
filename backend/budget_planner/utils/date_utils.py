"""
date_utils.py
Utility functions for deriving trip metadata from a TripRequest.
"""
from __future__ import annotations
from dataclasses import dataclass
from datetime import date


@dataclass
class TripMeta:
    """Derived metadata computed once from TripRequest before rule engine runs."""
    duration_days: int
    is_same_city: bool
    is_short_trip: bool     # duration_days <= 2
    is_long_trip: bool      # duration_days >= 10
    start_date_str: str     # "YYYY-MM-DD"
    end_date_str: str       # "YYYY-MM-DD"


def derive_trip_meta(
    start_place: str,
    destination_place: str,
    start_date: date,
    end_date: date,
) -> TripMeta:
    """
    Compute all derived trip metadata used by the rule engine.
    Called once at the start of generate() and refresh().
    """
    duration_days = (end_date - start_date).days
    is_same_city = start_place.strip().lower() == destination_place.strip().lower()

    return TripMeta(
        duration_days=duration_days,
        is_same_city=is_same_city,
        is_short_trip=duration_days <= 2,
        is_long_trip=duration_days >= 10,
        start_date_str=start_date.isoformat(),
        end_date_str=end_date.isoformat(),
    )
