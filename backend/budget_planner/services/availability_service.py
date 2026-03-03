"""
availability_service.py
Stub service for real-time availability checking.

Currently the rule engine uses cost jitter to simulate availability changes.
This stub reserves the namespace for future integration with live availability APIs
(e.g., hotel room counts, seat availability on trains/flights).
"""
from __future__ import annotations


class AvailabilityService:
    """
    Stub: Future real-time availability integration.
    """

    def check_transport_availability(self, transport: str, date: str) -> dict:
        """
        TODO: Call transport API (RailYatri, RedBus, IndiGo) to get seat availability.
        TODO: Return { available: bool, seats_left: int, price_inr: float }
        """
        raise NotImplementedError("AvailabilityService not yet implemented")

    def check_accommodation_availability(self, accommodation: str, check_in: str, check_out: str) -> dict:
        """
        TODO: Call hotel API (Booking.com, OYO) to get room availability.
        TODO: Return { available: bool, rooms_left: int, price_per_night_inr: float }
        """
        raise NotImplementedError("AvailabilityService not yet implemented")

    def get_availability_score(self, tier: str, destination: str, dates: list[str]) -> float:
        """
        TODO: Aggregate availability signals into a 0.0–1.0 score.
        TODO: Used as an optional additive field in future response versions.
        """
        raise NotImplementedError("AvailabilityService not yet implemented")
