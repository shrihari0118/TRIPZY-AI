import asyncio
import hashlib
import json
import logging
import math
import os
import time
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
from payment.routes import router as payment_router

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(payment_router)

# --- Model endpoints ---
GEMINI_PRIMARY_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.5-flash:generateContent"
)
GEMINI_FALLBACK_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.0-flash:generateContent"
)

# --- Retry configuration ---
RETRY_MAX_ATTEMPTS = 3
RETRY_BACKOFF_SECONDS = [1, 2, 4]
RETRYABLE_STATUS_CODES = {503, 429}

# --- Cache configuration ---
_trip_cache: dict[str, tuple[dict, float]] = {}
CACHE_TTL_SECONDS = 600  # 10 minutes

# --- Concurrency control ---
_gemini_semaphore = asyncio.Semaphore(2)

# --- Logging ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("tripzy")


class GeminiCallFailed(Exception):
    """All retry attempts exhausted for Gemini models."""
    pass
RESULT_KEYS = [
    "total_budget",
    "transport",
    "transportMode",
    "seats",
    "seatLayout",
    "fareOptions",
    "boardingPoints",
    "intermediateStops",
    "droppingPoints",
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
- Use transportMode values only from: "bus", "train", "flight"
- For bus:
  - Return a filled seatLayout with 1-based row and col positions
  - Return realistic seats with price and booking status
  - Keep fareOptions as an empty array
- For train and flight:
  - Return seats as an empty array
  - Return seatLayout as {{ "rows": 0, "cols": 0 }}
  - Return realistic fareOptions with pricing tiers and availability tags
- Always include boardingPoints, intermediateStops, and droppingPoints with chronological times
- Use source and destination-specific locations for the route timeline
- Do not include markdown fences or any extra text

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
  "transportMode": "bus | train | flight",
  "transport": {{
    "mode": "Bus/Train/Flight",
    "name": "Specific service name (e.g., KSRTC Airavat, IndiGo 6E-xxx)"
  }},
  "seats": [
    {{
      "id": "S1",
      "row": 1,
      "col": 1,
      "type": "sleeper | semi-sleeper | seater",
      "price": 1200,
      "isBooked": false
    }}
  ],
  "seatLayout": {{
    "rows": number,
    "cols": number
  }},
  "fareOptions": [
    {{
      "type": "Economy | Premium Economy | Business | Sleeper",
      "price": 2400,
      "availability": "Available | Few Left | Not Available"
    }}
  ],
  "boardingPoints": [
    {{
      "time": "06:30 AM",
      "name": "Boarding point name",
      "description": "Short boarding detail"
    }}
  ],
  "intermediateStops": [
    {{
      "time": "09:15 AM",
      "name": "Intermediate stop name",
      "description": "Short stop detail"
    }}
  ],
  "droppingPoints": [
    {{
      "time": "01:10 PM",
      "name": "Dropping point name",
      "description": "Short drop detail"
    }}
  ],
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
"""


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


def parse_count(
    value: Any,
    section_name: str,
    field_name: str,
    minimum: int = 0,
) -> int:
    if isinstance(value, bool):
        raise ValueError(f"{section_name} {field_name} must be an integer.")

    count: int | None = None
    if isinstance(value, int):
        count = value
    elif isinstance(value, float) and value.is_integer():
        count = int(value)
    elif isinstance(value, str) and value.strip().isdigit():
        count = int(value.strip())

    if count is None:
        raise ValueError(f"{section_name} {field_name} must be an integer.")

    if count < minimum:
        raise ValueError(f"{section_name} {field_name} must be at least {minimum}.")

    return count


def parse_boolean(value: Any, section_name: str, field_name: str) -> bool:
    if isinstance(value, bool):
        return value

    if isinstance(value, str):
        cleaned = value.strip().lower()
        if cleaned == "true":
            return True
        if cleaned == "false":
            return False

    raise ValueError(f"{section_name} {field_name} must be a boolean.")


def parse_budget_range(value: Any) -> dict[str, float]:
    if not isinstance(value, dict):
        raise ValueError("total_budget must be an object.")

    minimum = parse_amount(value.get("min"), "total_budget", "min")
    maximum = parse_amount(value.get("max"), "total_budget", "max")

    if minimum > maximum:
        raise ValueError("total_budget min cannot be greater than max.")

    return {"min": minimum, "max": maximum}


def parse_transport_mode(value: Any) -> str:
    cleaned = parse_non_empty_string(value, "transportMode", "value").lower()

    if "flight" in cleaned:
        return "flight"
    if "train" in cleaned:
        return "train"
    if "bus" in cleaned:
        return "bus"

    raise ValueError("transportMode must be bus, train, or flight.")


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


def parse_seat_layout(value: Any) -> dict[str, int]:
    if not isinstance(value, dict):
        raise ValueError("seatLayout must be an object.")

    return {
        "rows": parse_count(value.get("rows"), "seatLayout", "rows", minimum=0),
        "cols": parse_count(value.get("cols"), "seatLayout", "cols", minimum=0),
    }


def parse_seat_type(value: Any) -> str:
    cleaned = parse_non_empty_string(value, "seats", "type").lower().replace(" ", "-")

    if cleaned in {"semi-sleeper", "semisleeper"}:
        return "semi-sleeper"
    if cleaned in {"sleeper", "seater"}:
        return cleaned

    if "semi" in cleaned and "sleep" in cleaned:
        return "semi-sleeper"
    if "sleep" in cleaned:
        return "sleeper"
    if "seat" in cleaned:
        return "seater"

    raise ValueError("seats type must be sleeper, semi-sleeper, or seater.")


def parse_seats(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        raise ValueError("seats must be a list.")

    parsed_seats: list[dict[str, Any]] = []
    for index, seat in enumerate(value):
        if not isinstance(seat, dict):
            raise ValueError(f"seats item at index {index} must be an object.")

        parsed_seats.append(
            {
                "id": parse_non_empty_string(seat.get("id"), "seats", "id"),
                "row": parse_count(seat.get("row"), "seats", "row", minimum=1),
                "col": parse_count(seat.get("col"), "seats", "col", minimum=1),
                "type": parse_seat_type(seat.get("type")),
                "price": parse_amount(seat.get("price"), "seats", "price"),
                "isBooked": parse_boolean(seat.get("isBooked"), "seats", "isBooked"),
            }
        )

    return parsed_seats


def parse_fare_availability(value: Any) -> str:
    cleaned = parse_non_empty_string(value, "fareOptions", "availability").strip().lower()

    if cleaned == "available":
        return "Available"
    if cleaned in {"few left", "few seats left", "limited"}:
        return "Few Left"
    if cleaned in {"not available", "sold out", "unavailable"}:
        return "Not Available"

    raise ValueError("fareOptions availability must be Available, Few Left, or Not Available.")


def parse_fare_options(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        raise ValueError("fareOptions must be a list.")

    parsed_options: list[dict[str, Any]] = []
    for index, option in enumerate(value):
        if not isinstance(option, dict):
            raise ValueError(f"fareOptions item at index {index} must be an object.")

        parsed_options.append(
            {
                "type": parse_non_empty_string(option.get("type"), "fareOptions", "type"),
                "price": parse_amount(option.get("price"), "fareOptions", "price"),
                "availability": parse_fare_availability(option.get("availability")),
            }
        )

    return parsed_options


def parse_timeline_points(
    value: Any,
    section_name: str,
    *,
    allow_empty: bool,
) -> list[dict[str, str]]:
    if not isinstance(value, list):
        raise ValueError(f"{section_name} must be a list.")

    parsed_points: list[dict[str, str]] = []
    for index, point in enumerate(value):
        if not isinstance(point, dict):
            raise ValueError(f"{section_name} item at index {index} must be an object.")

        parsed_points.append(
            {
                "time": parse_non_empty_string(point.get("time"), section_name, "time"),
                "name": parse_non_empty_string(point.get("name"), section_name, "name"),
                "description": parse_non_empty_string(
                    point.get("description"),
                    section_name,
                    "description",
                ),
            }
        )

    if not parsed_points and not allow_empty:
        raise ValueError(f"{section_name} must contain at least one point.")

    return parsed_points


def validate_result(parsed: Any) -> dict[str, Any]:
    if not isinstance(parsed, dict):
        raise ValueError("Gemini response JSON must be an object.")

    missing_keys = [key for key in RESULT_KEYS if key not in parsed]
    if missing_keys:
        raise ValueError(f"Missing itinerary keys: {', '.join(missing_keys)}.")

    transport_mode = parse_transport_mode(parsed.get("transportMode"))
    transport = parse_transport(parsed.get("transport"))
    seat_layout = parse_seat_layout(parsed.get("seatLayout"))
    seats = parse_seats(parsed.get("seats"))
    fare_options = parse_fare_options(parsed.get("fareOptions"))
    boarding_points = parse_timeline_points(parsed.get("boardingPoints"), "boardingPoints", allow_empty=False)
    intermediate_stops = parse_timeline_points(
        parsed.get("intermediateStops"),
        "intermediateStops",
        allow_empty=True,
    )
    dropping_points = parse_timeline_points(parsed.get("droppingPoints"), "droppingPoints", allow_empty=False)

    if transport_mode == "bus":
        if seat_layout["rows"] < 1 or seat_layout["cols"] < 1:
            raise ValueError("seatLayout must include positive rows and cols for bus mode.")
        if not seats:
            raise ValueError("seats must contain at least one seat for bus mode.")
        if fare_options:
            raise ValueError("fareOptions must be empty for bus mode.")
    else:
        if seats:
            raise ValueError("seats must be empty for train and flight modes.")
        if seat_layout["rows"] != 0 or seat_layout["cols"] != 0:
            raise ValueError("seatLayout must be zeroed for train and flight modes.")
        if not fare_options:
            raise ValueError("fareOptions must contain at least one option for train and flight modes.")

    for seat in seats:
        if seat["row"] > seat_layout["rows"] or seat["col"] > seat_layout["cols"]:
            raise ValueError("seats coordinates cannot exceed seatLayout dimensions.")

    if parse_transport_mode(transport.get("mode")) != transport_mode:
        raise ValueError("transport mode and transportMode must describe the same transport type.")

    return {
        "total_budget": parse_budget_range(parsed.get("total_budget")),
        "transportMode": transport_mode,
        "transport": transport,
        "seats": seats,
        "seatLayout": seat_layout,
        "fareOptions": fare_options,
        "boardingPoints": boarding_points,
        "intermediateStops": intermediate_stops,
        "droppingPoints": dropping_points,
        "hotel": parse_hotel(parsed.get("hotel")),
        "food": parse_string_list(parsed.get("food"), "food"),
        "tourist_places": parse_string_list(parsed.get("tourist_places"), "tourist_places"),
        "activities": parse_string_list(parsed.get("activities"), "activities"),
        "entertainment": parse_string_list(parsed.get("entertainment"), "entertainment"),
    }


def _make_cache_key(trip: TripRequest) -> str:
    """SHA-256 hash of trip inputs for cache keying."""
    raw = f"{trip.source}|{trip.destination}|{trip.days}|{trip.adults}|{trip.children}|{trip.budget_type}"
    return hashlib.sha256(raw.encode()).hexdigest()


def _get_cached(key: str) -> dict[str, Any] | None:
    """Return cached result if present and not expired, else None."""
    entry = _trip_cache.get(key)
    if entry is None:
        logger.info("[CACHE MISS] key=%s", key[:12])
        return None
    data, timestamp = entry
    if time.time() - timestamp > CACHE_TTL_SECONDS:
        del _trip_cache[key]
        logger.info("[CACHE EXPIRED] key=%s", key[:12])
        return None
    logger.info("[CACHE HIT] key=%s", key[:12])
    return data


def _set_cache(key: str, data: dict[str, Any]) -> None:
    """Store result in cache with current timestamp."""
    _trip_cache[key] = (data, time.time())
    logger.info("[CACHE SET] key=%s", key[:12])


def _call_gemini_single(prompt: str, model_url: str, model_name: str) -> str:
    """Call a single Gemini model with exponential backoff retry.

    Returns the response text on success.
    Raises GeminiCallFailed if all retries are exhausted.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not set.")

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.1},
    }
    headers = {
        "x-goog-api-key": api_key,
        "Content-Type": "application/json",
    }

    last_error: str = ""

    for attempt in range(RETRY_MAX_ATTEMPTS):
        try:
            logger.info(
                "[GEMINI] Attempt %d/%d for %s",
                attempt + 1, RETRY_MAX_ATTEMPTS, model_name,
            )
            response = requests.post(
                model_url, headers=headers, json=payload, timeout=60,
            )

            # --- Retryable server errors (503, 429) ---
            if response.status_code in RETRYABLE_STATUS_CODES:
                wait = RETRY_BACKOFF_SECONDS[min(attempt, len(RETRY_BACKOFF_SECONDS) - 1)]
                logger.warning(
                    "[RETRY] Attempt %d/%d for %s — HTTP %d, waiting %ds",
                    attempt + 1, RETRY_MAX_ATTEMPTS, model_name,
                    response.status_code, wait,
                )
                last_error = f"HTTP {response.status_code}"
                time.sleep(wait)
                continue

            # --- Non-retryable client errors (4xx) ---
            if 400 <= response.status_code < 500:
                raise GeminiCallFailed(
                    f"Client error {response.status_code} from {model_name}"
                )

            response.raise_for_status()
            response_data = response.json()
            text = response_data["candidates"][0]["content"]["parts"][0]["text"]
            logger.info("[GEMINI] Success from %s on attempt %d", model_name, attempt + 1)
            return text

        except (requests.ConnectionError, requests.Timeout) as exc:
            wait = RETRY_BACKOFF_SECONDS[min(attempt, len(RETRY_BACKOFF_SECONDS) - 1)]
            logger.warning(
                "[RETRY] Attempt %d/%d for %s — %s, waiting %ds",
                attempt + 1, RETRY_MAX_ATTEMPTS, model_name,
                type(exc).__name__, wait,
            )
            last_error = f"{type(exc).__name__}: {exc}"
            time.sleep(wait)
            continue

        except GeminiCallFailed:
            raise

        except requests.RequestException as exc:
            last_error = f"RequestException: {exc}"
            logger.error("[GEMINI] Non-retryable error from %s: %s", model_name, last_error)
            break

        except (KeyError, IndexError, TypeError) as exc:
            last_error = f"Response parse error: {exc}"
            logger.error("[GEMINI] Bad response structure from %s: %s", model_name, last_error)
            break

    raise GeminiCallFailed(
        f"All {RETRY_MAX_ATTEMPTS} retries exhausted for {model_name}: {last_error}"
    )


def call_gemini(prompt: str) -> tuple[str | None, str]:
    """Call Gemini with retry and automatic fallback.

    Returns: (response_text_or_none, model_name_used_or_failed)
    """
    primary_exc: Exception | None = None
    fallback_exc: Exception | None = None

    # --- Try primary model ---
    try:
        text = _call_gemini_single(prompt, GEMINI_PRIMARY_URL, "gemini-2.5-flash")
        return text, "gemini-2.5-flash"
    except GeminiCallFailed as exc:
        primary_exc = exc
        logger.warning(
            "[FALLBACK] Primary model failed: %s - switching to gemini-2.0-flash",
            primary_exc,
        )
    except Exception as exc:
        primary_exc = exc
        logger.exception("[GEMINI] Unexpected failure from gemini-2.5-flash")
        logger.warning(
            "[FALLBACK] Primary model failed: %s - switching to gemini-2.0-flash",
            primary_exc,
        )

    # --- Try fallback model ---
    try:
        text = _call_gemini_single(prompt, GEMINI_FALLBACK_URL, "gemini-2.0-flash")
        return text, "gemini-2.0-flash"
    except GeminiCallFailed as exc:
        fallback_exc = exc
    except Exception as exc:
        fallback_exc = exc
        logger.exception("[GEMINI] Unexpected failure from gemini-2.0-flash")

    logger.error("[FAILED] All Gemini attempts failed safely")
    logger.error("[FAILED] Primary error: %s", primary_exc)
    logger.error("[FAILED] Fallback error: %s", fallback_exc)
    return None, "failed"


def generate_itinerary(
    trip: TripRequest, distance_km: float,
) -> tuple[dict[str, Any] | None, str]:
    """Generate itinerary within a single Gemini request flow."""
    content, model_used = call_gemini(build_prompt(trip, distance_km))
    if content is None:
        return None, model_used

    parsed = parse_response(content)
    result = validate_result(parsed)
    return result, model_used


def save_trip_history(
    user_id: str | None,
    trip: TripRequest,
    result: dict[str, Any],
    created_at: str,
) -> str:
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
        "payment": {
            "status": "pending",
            "updated_at": created_at,
        },
    }

    try:
        insert_result = budget_requests_collection.insert_one(document)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to save trip history.") from exc

    return str(insert_result.inserted_id)


@app.post("/generate-trip")
async def generate_trip(
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

    # --- Coordinates (blocking → thread) ---
    try:
        source_lat, source_lon = await asyncio.to_thread(
            get_coordinates, cleaned_trip.source,
        )
        destination_lat, destination_lon = await asyncio.to_thread(
            get_coordinates, cleaned_trip.destination,
        )
    except Exception as exc:
        detail = str(exc)
        status_code = 404 if "No coordinates found for" in detail else 500
        raise HTTPException(status_code=status_code, detail=detail) from exc

    distance_km = calculate_distance(
        source_lat, source_lon, destination_lat, destination_lon,
    )

    # --- Cache check ---
    cache_key = _make_cache_key(cleaned_trip)
    cached_result = _get_cached(cache_key)
    if cached_result is not None:
        created_at = datetime.now(timezone.utc).isoformat()
        trip_id = await asyncio.to_thread(
            save_trip_history, user_id, cleaned_trip, cached_result, created_at,
        )
        return {
            "status": "success",
            "message": "Trip plan retrieved from cache.",
            "data": {
                "trip_id": trip_id,
                "user_id": user_id,
                "source": cleaned_trip.source,
                "destination": cleaned_trip.destination,
                "days": cleaned_trip.days,
                "adults": cleaned_trip.adults,
                "children": cleaned_trip.children,
                "budget_type": cleaned_trip.budget_type,
                "distance_km": distance_km,
                "result": cached_result,
                "created_at": created_at,
                "payment_status": "pending",
                "paid_at": None,
            },
        }

    # --- Gemini call (semaphore-controlled) ---
    try:
        start_time = time.time()
        logger.info("[QUEUE] Waiting for semaphore...")

        async with _gemini_semaphore:
            queue_wait = time.time() - start_time
            if queue_wait > 0.01:
                logger.info("[QUEUE] Waited %.2fs for semaphore", queue_wait)

            result, model_used = await asyncio.to_thread(
                generate_itinerary, cleaned_trip, distance_km,
            )

        elapsed = time.time() - start_time

    except ValueError as exc:
        logger.error("[FAILED] Response validation failed: %s", exc)
        return {
            "status": "retry_failed",
            "message": f"Failed to generate valid trip plan: {exc}",
            "data": None,
        }

    if result is None:
        return {
            "status": "retry_failed",
            "message": "All Gemini API attempts failed",
            "data": None,
        }

    logger.info("[SUCCESS] Trip generated via %s in %.1fs", model_used, elapsed)

    # --- Determine status ---
    status = "fallback" if model_used == "gemini-2.0-flash" else "success"
    message = (
        "Trip plan generated successfully."
        if status == "success"
        else "Trip plan generated using fallback model."
    )

    created_at = datetime.now(timezone.utc).isoformat()
    trip_id = await asyncio.to_thread(
        save_trip_history, user_id, cleaned_trip, result, created_at,
    )

    response_data = {
        "trip_id": trip_id,
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
        "payment_status": "pending",
        "paid_at": None,
    }

    # --- Cache store ---
    _set_cache(cache_key, result)

    return {
        "status": status,
        "message": message,
        "data": response_data,
    }
