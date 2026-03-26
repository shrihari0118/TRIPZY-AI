"""
flight_service.py
Fetches and selects the best flight using AviationStack.
"""
from __future__ import annotations

import math
import random
from datetime import datetime
from typing import Any, TypedDict

import requests

from shared.config import AVIATIONSTACK_API_KEY


class FlightSelection(TypedDict):
    name: str
    route: str
    departure: str
    arrival: str
    price: int


_AVIATIONSTACK_URL = "http://api.aviationstack.com/v1/flights"
_REQUEST_TIMEOUT_SECONDS = 10

# Airport coordinates to estimate route distance.
_AIRPORT_COORDS: dict[str, tuple[float, float]] = {
    "DEL": (28.5562, 77.1000),
    "BOM": (19.0896, 72.8656),
    "BLR": (13.1986, 77.7066),
    "MAA": (12.9941, 80.1709),
    "HYD": (17.2403, 78.4294),
    "CCU": (22.6547, 88.4467),
    "AMD": (23.0734, 72.6266),
    "COK": (10.1510, 76.4019),
    "GOI": (15.3808, 73.8314),
    "PNQ": (18.5821, 73.9197),
    "CJB": (11.0310, 77.0434),
}


def get_best_flight(
    dep_iata: str,
    arr_iata: str,
    date: str,
    max_budget: int,
) -> FlightSelection | None:
    """
    Select the cheapest valid flight within max_budget.
    """
    origin = (dep_iata or "").strip().upper()
    destination = (arr_iata or "").strip().upper()
    flight_date = (date or "").strip()

    if not origin or not destination or origin == destination:
        return None
    if max_budget <= 0:
        return None
    if not AVIATIONSTACK_API_KEY or AVIATIONSTACK_API_KEY == "YOUR_API_KEY":
        return None

    # NOTE: flight_date is NOT supported on the Aviationstack free plan
    # (causes "function_access" error).  We omit it so the API returns
    # today's live flight data instead.
    params: dict[str, str] = {
        "access_key": AVIATIONSTACK_API_KEY,
        "dep_iata": origin,
        "arr_iata": destination,
    }
    payload = _fetch_flights_payload(params)
    data = payload.get("data", [])
    if not isinstance(data, list):
        return None

    candidates: list[FlightSelection] = []
    seen: set[tuple[str, str]] = set()
    for item in data:
        if not isinstance(item, dict):
            continue

        airline_name = ((item.get("airline") or {}).get("name") or "").strip()
        flight_info = item.get("flight") or {}
        flight_number = str(flight_info.get("iata") or flight_info.get("number") or "").strip()
        if not airline_name or not flight_number:
            continue

        dedupe_key = (airline_name, flight_number)
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)

        price = estimate_price(origin, destination)
        if price > max_budget:
            continue

        departure_raw = (item.get("departure") or {}).get("scheduled")
        arrival_raw = (item.get("arrival") or {}).get("scheduled")
        candidates.append(
            {
                "name": f"{airline_name} {flight_number}",
                "route": f"{origin} \u2192 {destination}",
                "departure": _to_hhmm(departure_raw),
                "arrival": _to_hhmm(arrival_raw),
                "price": price,
            }
        )

    if not candidates:
        return None

    return min(candidates, key=lambda flight: flight["price"])


def estimate_price(origin: str, destination: str) -> int:
    """
    Estimate a one-way ticket price in INR by route distance category.
    """
    distance_km = _estimate_distance_km(origin, destination)

    if distance_km < 500:
        return random.randint(2500, 4000)
    if distance_km <= 1000:
        return random.randint(4000, 7000)
    return random.randint(7000, 15000)


def _fetch_flights_payload(params: dict[str, str]) -> dict[str, Any]:
    try:
        response = requests.get(_AVIATIONSTACK_URL, params=params, timeout=_REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()
        payload = response.json()
    except Exception:
        return {}

    if isinstance(payload, dict) and payload.get("error"):
        return {}
    if isinstance(payload, dict):
        return payload
    return {}


def _to_hhmm(value: Any) -> str:
    if not value:
        return ""

    text = str(value).strip()
    if not text:
        return ""

    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        return parsed.strftime("%H:%M")
    except ValueError:
        pass

    if len(text) >= 16 and text[10] in ("T", " "):
        maybe_time = text[11:16]
        if len(maybe_time) == 5 and maybe_time[2] == ":":
            return maybe_time

    return text


def _estimate_distance_km(origin: str, destination: str) -> float:
    start = _AIRPORT_COORDS.get((origin or "").strip().upper())
    end = _AIRPORT_COORDS.get((destination or "").strip().upper())
    if not start or not end:
        # Unknown routes default to medium distance.
        return 750.0
    return _haversine_km(start, end)


def _haversine_km(start: tuple[float, float], end: tuple[float, float]) -> float:
    lat1, lon1 = start
    lat2, lon2 = end

    radius_km = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius_km * c

