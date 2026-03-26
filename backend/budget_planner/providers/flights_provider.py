"""
flights_provider.py
Live flight provider backed by AviationStack.
"""
from __future__ import annotations

import asyncio
import hashlib
import time
from typing import Any, Literal, TypedDict

import requests
from requests import RequestException

from budget_planner.models.budget_entities import BudgetTier
from shared.config import AVIATIONSTACK_API_KEY


class FlightOption(TypedDict):
    type: Literal["flight"]
    airline: str
    flight_number: str
    departure_airport: str
    arrival_airport: str
    departure_time: str
    arrival_time: str
    status: str
    price_estimate: int
    tier: BudgetTier


class AviationStackProvider:
    BASE_URL = "http://api.aviationstack.com/v1/flights"
    CACHE_TTL_SECONDS = 300
    MAX_FLIGHTS = 5

    def __init__(
        self,
        api_key: str | None = None,
        timeout_seconds: int = 10,
    ) -> None:
        self.api_key = api_key or AVIATIONSTACK_API_KEY or ""
        self.timeout_seconds = timeout_seconds
        self._cache: dict[str, tuple[float, list[FlightOption]]] = {}

    async def search_flights(
        self,
        origin_iata: str,
        destination_iata: str,
        date: str | None = None,
    ) -> list[FlightOption]:
        origin = (origin_iata or "").strip().upper()
        destination = (destination_iata or "").strip().upper()
        flight_date = (date or "").strip()

        if not origin or not destination or origin == destination:
            return []
        if not self.api_key or self.api_key == "YOUR_API_KEY":
            return []

        cache_key = self._cache_key(origin, destination, flight_date)
        cached = self._cache.get(cache_key)
        if cached and (time.time() - cached[0] < self.CACHE_TTL_SECONDS):
            return list(cached[1])

        params: dict[str, str] = {
            "access_key": self.api_key,
            "dep_iata": origin,
            "arr_iata": destination,
        }
        if flight_date:
            params["flight_date"] = flight_date

        try:
            raw_flights = await asyncio.to_thread(self._fetch_flights, params)
        except Exception:
            return []

        normalized: list[FlightOption] = []
        seen_keys: set[tuple[str, str]] = set()
        for item in raw_flights:
            option = self._normalize_flight(item, origin, destination, flight_date)
            if not option:
                continue
            dedupe_key = (option["airline"], option["flight_number"])
            if dedupe_key in seen_keys:
                continue
            seen_keys.add(dedupe_key)
            normalized.append(option)

        normalized.sort(key=lambda flight: flight["price_estimate"])
        limited = normalized[: self.MAX_FLIGHTS]
        self._cache[cache_key] = (time.time(), limited)
        return list(limited)

    def search_flights_sync(
        self,
        origin_iata: str,
        destination_iata: str,
        date: str | None = None,
    ) -> list[FlightOption]:
        """
        Synchronous bridge for current budget-generator flow.
        """
        try:
            return asyncio.run(self.search_flights(origin_iata, destination_iata, date))
        except RuntimeError:
            loop = asyncio.new_event_loop()
            try:
                return loop.run_until_complete(self.search_flights(origin_iata, destination_iata, date))
            finally:
                loop.close()

    def categorize_flight(self, price: int) -> BudgetTier:
        if price < 6000:
            return "budget"
        if price <= 12000:
            return "moderate"
        return "luxury"

    def _cache_key(self, origin: str, destination: str, date: str) -> str:
        return f"{origin}:{destination}:{date}"

    def _fetch_flights(self, params: dict[str, str]) -> list[dict[str, Any]]:
        try:
            response = requests.get(self.BASE_URL, params=params, timeout=self.timeout_seconds)
            response.raise_for_status()
            payload = response.json()
        except RequestException as exc:
            raise RuntimeError(f"AviationStack request failed: {exc}") from exc
        except ValueError as exc:
            raise RuntimeError("AviationStack response was not valid JSON") from exc

        if isinstance(payload, dict) and payload.get("error"):
            message = payload["error"].get("message", "Unknown AviationStack error")
            raise RuntimeError(message)

        data = payload.get("data", []) if isinstance(payload, dict) else []
        if not isinstance(data, list):
            return []
        return [item for item in data if isinstance(item, dict)]

    def _normalize_flight(
        self,
        item: dict[str, Any],
        origin: str,
        destination: str,
        flight_date: str,
    ) -> FlightOption | None:
        airline = (item.get("airline") or {}).get("name") or "Unknown Airline"
        flight_data = item.get("flight") or {}
        flight_number = (
            flight_data.get("iata")
            or flight_data.get("number")
            or flight_data.get("icao")
            or "N/A"
        )
        if flight_number == "N/A":
            return None

        departure = item.get("departure") or {}
        arrival = item.get("arrival") or {}
        dep_iata = departure.get("iata") or origin
        arr_iata = arrival.get("iata") or destination
        departure_time = departure.get("scheduled") or departure.get("estimated") or flight_date
        arrival_time = arrival.get("scheduled") or arrival.get("estimated") or flight_date
        status = item.get("flight_status") or "scheduled"

        price_estimate = self._estimate_price(
            airline=airline,
            flight_number=flight_number,
            origin=dep_iata,
            destination=arr_iata,
            flight_date=flight_date,
        )

        return {
            "type": "flight",
            "airline": str(airline),
            "flight_number": str(flight_number),
            "departure_airport": str(dep_iata),
            "arrival_airport": str(arr_iata),
            "departure_time": str(departure_time or ""),
            "arrival_time": str(arrival_time or ""),
            "status": str(status),
            "price_estimate": price_estimate,
            "tier": self.categorize_flight(price_estimate),
        }

    def _estimate_price(
        self,
        airline: str,
        flight_number: str,
        origin: str,
        destination: str,
        flight_date: str,
    ) -> int:
        """
        Deterministic estimate in INR for tier classification:
        budget:   3000-5999
        moderate: 6000-12000
        luxury:   12001-30000
        """
        seed = f"{airline}|{flight_number}|{origin}|{destination}|{flight_date}"
        digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
        raw_value = int(digest[:8], 16)
        return 3000 + (raw_value % 27001)

