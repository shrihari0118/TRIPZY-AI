import json
import math
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from deep_translator import GoogleTranslator
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from pydantic import BaseModel, Field


BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent

load_dotenv(PROJECT_ROOT / ".env", override=False)
load_dotenv(BACKEND_DIR / ".env", override=False)

from auth import router as auth_router
from database import db
from jwt_handler import ALGORITHM, SECRET_KEY

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

GEMINI_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent"
RESULT_KEYS = [
    "total_budget",
    "transport",
    "hotel",
    "food",
    "tourist_places",
    "activities",
    "entertainment",
]
budget_requests_collection = db["budget_requests"]


class TranslationRequest(BaseModel):
    text: str
    target_language: str


class TripRequest(BaseModel):
    source: str = Field(..., min_length=1)
    destination: str = Field(..., min_length=1)
    days: int = Field(..., ge=1)
    adults: int = Field(..., ge=1)
    children: int = Field(..., ge=0)
    budget_type: str = Field(..., min_length=1)


@app.get("/")
def home() -> dict[str, str]:
    return {"message": "Translator API is running"}


@app.post("/translate")
def translate_text(request: TranslationRequest) -> dict[str, str]:
    translated_text = GoogleTranslator(
        source="auto",
        target=request.target_language,
    ).translate(request.text)

    return {"translated_text": translated_text}


def get_current_user_id(authorization: str | None) -> str | None:
    if not authorization:
        return None

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid authorization header.")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token.") from exc

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token does not contain user_id.")

    return str(user_id)


def get_coordinates(city: str) -> tuple[float, float]:
    url = "https://nominatim.openstreetmap.org/search"

    params = {
        "q": city.strip(),
        "format": "json",
        "limit": 1,
    }

    headers = {
        "User-Agent": "tripzy-ai-app",
    }

    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()

        if not data:
            raise Exception(f"No coordinates found for {city}")

        lat = float(data[0]["lat"])
        lon = float(data[0]["lon"])

        return lat, lon

    except Exception as exc:
        raise Exception(f"Failed to fetch coordinates for {city}: {str(exc)}") from exc


def calculate_distance(
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
    return f"""You are a professional travel planner for India.

Generate a COMPLETE travel plan.

STRICT RULES:
- Output ONLY valid JSON
- No explanation text
- Include REALISTIC names:
  - Transport (bus/train/flight with real service names)
  - Hotel (realistic names)
  - Restaurants (real or realistic)
  - Tourist places (accurate to destination)
- Budget must be realistic in INR
- Tailor plan based on budget type

Inputs:
- Source: {trip.source}
- Destination: {trip.destination}
- Distance: {distance_km} km
- Days: {trip.days}
- Travelers: {trip.adults} adults, {trip.children} children
- Budget: {trip.budget_type}

Return ONLY this JSON structure:

{{
  "total_budget": {{
    "min": number,
    "max": number
  }},
  "transport": {{
    "mode": "Bus/Train/Flight",
    "name": "Specific service name (e.g., KSRTC Airavat, IndiGo 6E-xxx)"
  }},
  "hotel": {{
    "name": "Hotel name",
    "type": "budget/moderate/luxury"
  }},
  "food": [
    "Restaurant 1",
    "Restaurant 2",
    "Local mess name"
  ],
  "tourist_places": [
    "Place 1",
    "Place 2"
  ],
  "activities": [
    "Activity 1",
    "Activity 2"
  ],
  "entertainment": [
    "Entertainment option 1",
    "Entertainment option 2"
  ]
}}

Do not include markdown fences or any extra text."""


def parse_response(text: str) -> dict[str, Any]:
    cleaned_text = text.strip()

    try:
        return json.loads(cleaned_text)
    except json.JSONDecodeError:
        fenced_text = (
            cleaned_text
            .replace("```json", "")
            .replace("```JSON", "")
            .replace("```", "")
            .strip()
        )

    try:
        return json.loads(fenced_text)
    except json.JSONDecodeError as exc:
        raise ValueError("Gemini response did not contain valid JSON.") from exc


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


def parse_non_empty_string(value: Any, section_name: str, field_name: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{section_name} {field_name} must be a string.")

    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"{section_name} {field_name} cannot be empty.")

    return cleaned


def parse_string_list(value: Any, section_name: str) -> list[str]:
    if not isinstance(value, list):
        raise ValueError(f"{section_name} must be a list.")

    cleaned_items = [
        item.strip()
        for item in value
        if isinstance(item, str) and item.strip()
    ]
    if not cleaned_items:
        raise ValueError(f"{section_name} must contain at least one string.")

    return cleaned_items


def parse_budget_range(value: Any) -> dict[str, float]:
    if not isinstance(value, dict):
        raise ValueError("total_budget must be an object.")

    minimum = parse_amount(value.get("min"), "total_budget", "min")
    maximum = parse_amount(value.get("max"), "total_budget", "max")

    if minimum > maximum:
        raise ValueError("total_budget min cannot be greater than max.")

    return {"min": minimum, "max": maximum}


def parse_transport(value: Any) -> dict[str, str]:
    if not isinstance(value, dict):
        raise ValueError("transport must be an object.")

    return {
        "mode": parse_non_empty_string(value.get("mode"), "transport", "mode"),
        "name": parse_non_empty_string(value.get("name"), "transport", "name"),
    }


def parse_hotel(value: Any) -> dict[str, str]:
    if not isinstance(value, dict):
        raise ValueError("hotel must be an object.")

    return {
        "name": parse_non_empty_string(value.get("name"), "hotel", "name"),
        "type": parse_non_empty_string(value.get("type"), "hotel", "type"),
    }


def validate_result(parsed: Any) -> dict[str, Any]:
    if not isinstance(parsed, dict):
        raise ValueError("Gemini response JSON must be an object.")

    missing_keys = [key for key in RESULT_KEYS if key not in parsed]
    if missing_keys:
        raise ValueError(f"Missing itinerary keys: {', '.join(missing_keys)}.")

    return {
        "total_budget": parse_budget_range(parsed.get("total_budget")),
        "transport": parse_transport(parsed.get("transport")),
        "hotel": parse_hotel(parsed.get("hotel")),
        "food": parse_string_list(parsed.get("food"), "food"),
        "tourist_places": parse_string_list(parsed.get("tourist_places"), "tourist_places"),
        "activities": parse_string_list(parsed.get("activities"), "activities"),
        "entertainment": parse_string_list(parsed.get("entertainment"), "entertainment"),
    }


def call_gemini(prompt: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not set.")

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt,
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1
        },
    }

    try:
        response = requests.post(
            GEMINI_URL,
            headers={
                "x-goog-api-key": api_key,
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=60,
        )
        response.raise_for_status()

        # 🔥 IMPORTANT: print actual error

        response_data = response.json()

        # 🔥 Handle Gemini error response properly
        return response_data["candidates"][0]["content"]["parts"][0]["text"]

    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail="Gemini API request failed.") from exc
    except (KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=502, detail="Invalid Gemini API response.") from exc


def generate_itinerary(trip: TripRequest, distance_km: float) -> dict[str, Any]:
    try:
        content = call_gemini(build_prompt(trip, distance_km))
        parsed = parse_response(content)
        return validate_result(parsed)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="Failed to parse Gemini response.") from exc


def save_trip_history(
    user_id: str | None,
    trip: TripRequest,
    result: dict[str, Any],
    created_at: str,
) -> None:
    document = {
        "user_id": user_id,
        "source": trip.source,
        "destination": trip.destination,
        "days": trip.days,
        "adults": trip.adults,
        "children": trip.children,
        "budget_type": trip.budget_type,
        "result": result,
        "created_at": created_at,
    }

    try:
        budget_requests_collection.insert_one(document)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to save trip history.") from exc


@app.post("/generate-trip")
def generate_trip(
    trip: TripRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    source = trip.source.strip()
    destination = trip.destination.strip()
    budget_type = trip.budget_type.strip()

    if not source or not destination or not budget_type:
        raise HTTPException(
            status_code=422,
            detail="source, destination, and budget_type cannot be empty.",
        )

    cleaned_trip = TripRequest(
        source=source,
        destination=destination,
        days=trip.days,
        adults=trip.adults,
        children=trip.children,
        budget_type=budget_type,
    )

    user_id = get_current_user_id(authorization)

    try:
        source_lat, source_lon = get_coordinates(cleaned_trip.source)
        destination_lat, destination_lon = get_coordinates(cleaned_trip.destination)
    except Exception as exc:
        detail = str(exc)
        status_code = 404 if "No coordinates found for" in detail else 502
        raise HTTPException(status_code=status_code, detail=detail) from exc

    distance_km = calculate_distance(
        source_lat,
        source_lon,
        destination_lat,
        destination_lon,
    )
    result = generate_itinerary(cleaned_trip, distance_km)
    created_at = datetime.now(timezone.utc).isoformat()

    save_trip_history(user_id, cleaned_trip, result, created_at)

    return {
        "user_id": user_id,
        "source": cleaned_trip.source,
        "destination": cleaned_trip.destination,
        "days": cleaned_trip.days,
        "adults": cleaned_trip.adults,
        "children": cleaned_trip.children,
        "budget_type": cleaned_trip.budget_type,
        "distance_km": distance_km,
        "result": result,
        "created_at": created_at,
    }
