"""
airport_mapper.py
Maps common Indian city names to airport IATA codes.
"""
from __future__ import annotations


_CITY_TO_IATA: dict[str, str] = {
    "chennai": "MAA",
    "coimbatore": "CJB",
    "delhi": "DEL",
    "new delhi": "DEL",
    "mumbai": "BOM",
    "bangalore": "BLR",
    "bengaluru": "BLR",
    "hyderabad": "HYD",
    "kolkata": "CCU",
    "pune": "PNQ",
    "goa": "GOI",
    "ahmedabad": "AMD",
    "kochi": "COK",
    "cochin": "COK",
}


def get_airport_code(city_name: str) -> str | None:
    """
    Return IATA code for a city string.
    Accepts raw city names and already-formatted 3-letter IATA inputs.
    """
    value = (city_name or "").strip()
    if not value:
        return None

    normalized = value.lower()
    if normalized in _CITY_TO_IATA:
        return _CITY_TO_IATA[normalized]

    upper = value.upper()
    if len(upper) == 3 and upper.isalpha():
        return upper
    return None

