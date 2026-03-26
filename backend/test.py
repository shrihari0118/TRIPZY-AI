import json
import math
import os
import re
from typing import Any

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


load_dotenv()

app = FastAPI()

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OPENAI_URL = "https://api.openai.com/v1/chat/completions"
OPENAI_MODEL = "gpt-4o-mini"
USER_AGENT = "tripzy-ai"
PRICE_KEYS = ["transport", "hotel", "food", "local_transport", "total"]


class TripRequest(BaseModel):
    source: str = Field(..., min_length=1)
    destination: str = Field(..., min_length=1)
    days: int = Field(..., ge=1)
    adults: int = Field(..., ge=1)
    children: int = Field(..., ge=0)
    budget_type: str = Field(..., min_length=1)


def get_coordinates(city: str) -> tuple[float, float]:
    try:
        response = requests.get(
            NOMINATIM_URL,
            params={"q": city, "format": "json"},
            headers={"User-Agent": USER_AGENT},
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch coordinates for {city} from Nominatim.",
        ) from exc

    if not data:
        raise HTTPException(
            status_code=404,
            detail=f"No coordinates found for {city}.",
        )

    try:
        latitude = float(data[0]["lat"])
        longitude = float(data[0]["lon"])
        return latitude, longitude
    except (KeyError, TypeError, ValueError, IndexError) as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Invalid coordinate data received for {city}.",
        ) from exc


def haversine_distance_km(
    source_lat: float,
    source_lon: float,
    destination_lat: float,
    destination_lon: float,
) -> float:
    radius_km = 6371.0

    source_lat_rad = math.radians(source_lat)
    source_lon_rad = math.radians(source_lon)
    destination_lat_rad = math.radians(destination_lat)
    destination_lon_rad = math.radians(destination_lon)

    delta_lat = destination_lat_rad - source_lat_rad
    delta_lon = destination_lon_rad - source_lon_rad

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(source_lat_rad)
        * math.cos(destination_lat_rad)
        * math.sin(delta_lon / 2) ** 2
    )
    c = 2 * math.asin(math.sqrt(a))

    return round(radius_km * c * 1.2, 2)


def build_prompt(trip: TripRequest, distance_km: float) -> str:
    return f"""You are an AI travel planner for India.

Inputs:
- Source: {trip.source}
- Destination: {trip.destination}
- Distance: {distance_km} km
- Days: {trip.days}
- Travelers: {trip.adults} adults, {trip.children} children
- Budget: {trip.budget_type}

Rules:
- Use realistic Indian pricing (\u20b9)
- Suggest transport based on distance
- Budget-friendly should be cheap, luxury should be premium
- Include food and local travel costs
- Keep it practical and realistic

Return ONLY JSON in this format:

{{
  "transport": {{ "min": 0, "max": 0 }},
  "hotel": {{ "min": 0, "max": 0 }},
  "food": {{ "min": 0, "max": 0 }},
  "local_transport": {{ "min": 0, "max": 0 }},
  "total": {{ "min": 0, "max": 0 }}
}}
"""


def extract_json_text(content: Any) -> str:
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        text_parts: list[str] = []
        for item in content:
            if isinstance(item, dict):
                text = item.get("text")
                if text:
                    text_parts.append(str(text))
        return "\n".join(text_parts)

    return str(content)


def parse_amount(value: Any, section_name: str, field_name: str) -> float:
    if isinstance(value, (int, float)):
        return round(float(value), 2)

    if isinstance(value, str):
        cleaned = (
            value.replace(",", "")
            .replace("\u20b9", "")
            .replace("INR", "")
            .replace("Rs.", "")
            .replace("Rs", "")
            .strip()
        )
        try:
            return round(float(cleaned), 2)
        except ValueError as exc:
            raise ValueError(
                f"{section_name} {field_name} must be numeric."
            ) from exc

    raise ValueError(f"{section_name} {field_name} must be numeric.")


def parse_price_range(section_name: str, value: Any) -> dict[str, float]:
    if not isinstance(value, dict):
        raise ValueError(f"{section_name} must be an object.")

    minimum = parse_amount(value.get("min"), section_name, "min")
    maximum = parse_amount(value.get("max"), section_name, "max")

    if minimum > maximum:
        raise ValueError(f"{section_name} min cannot be greater than max.")

    return {"min": minimum, "max": maximum}


def parse_openai_response(content: Any) -> dict[str, dict[str, float]]:
    json_text = extract_json_text(content).strip()

    try:
        parsed = json.loads(json_text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", json_text, re.DOTALL)
        if not match:
            raise ValueError("OpenAI response did not contain valid JSON.") from None
        parsed = json.loads(match.group(0))

    if not isinstance(parsed, dict):
        raise ValueError("OpenAI response JSON must be an object.")

    return {
        key: parse_price_range(key, parsed.get(key))
        for key in PRICE_KEYS
    }


def get_trip_estimate_from_openai(trip: TripRequest, distance_km: float) -> dict[str, dict[str, float]]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY is not set.",
        )

    payload = {
        "model": OPENAI_MODEL,
        "messages": [
            {
                "role": "user",
                "content": build_prompt(trip, distance_km),
            }
        ],
        "temperature": 0.3,
        "response_format": {"type": "json_object"},
    }

    try:
        response = requests.post(
            OPENAI_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=60,
        )
        response.raise_for_status()
        response_data = response.json()
        content = response_data["choices"][0]["message"]["content"]
        return parse_openai_response(content)
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502,
            detail="OpenAI API request failed.",
        ) from exc
    except (KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=502,
            detail="Failed to parse OpenAI response.",
        ) from exc


@app.post("/generate-trip")
def generate_trip(trip: TripRequest) -> dict[str, Any]:
    source = trip.source.strip()
    destination = trip.destination.strip()
    budget_type = trip.budget_type.strip()

    if not source or not destination or not budget_type:
        raise HTTPException(
            status_code=422,
            detail="Source, destination, and budget_type cannot be empty.",
        )

    cleaned_trip = TripRequest(
        source=source,
        destination=destination,
        days=trip.days,
        adults=trip.adults,
        children=trip.children,
        budget_type=budget_type,
    )

    source_lat, source_lon = get_coordinates(source)
    destination_lat, destination_lon = get_coordinates(destination)
    distance_km = haversine_distance_km(
        source_lat,
        source_lon,
        destination_lat,
        destination_lon,
    )
    estimate = get_trip_estimate_from_openai(cleaned_trip, distance_km)

    return {
        "source": source,
        "destination": destination,
        "distance_km": distance_km,
        "days": trip.days,
        "travelers": {
            "adults": trip.adults,
            "children": trip.children,
        },
        "budget_type": budget_type,
        "estimate": estimate,
    }
