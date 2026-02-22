"""
budget_repository.py
MongoDB repository for storing and fetching budget plan requests.
Uses the existing `db` object from backend/database.py — no changes to MongoDB setup.
"""
from __future__ import annotations
from datetime import datetime, timezone
from uuid import UUID

from database import db

# Collection for budget plan requests
budget_requests_collection = db["budget_requests"]


def save_request(
    request_id: UUID,
    trip_data: dict,
    plans_data: list[dict],
) -> None:
    """
    Persist a generated budget request and its plans to MongoDB.

    Args:
        request_id: UUID assigned to this generation request.
        trip_data: Serialized TripRequest fields.
        plans_data: Serialized list of BudgetPlan dicts.
    """
    document = {
        "_id": str(request_id),
        "requestId": str(request_id),
        "tripData": trip_data,
        "plans": plans_data,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "lastUpdatedAt": datetime.now(timezone.utc).isoformat(),
    }
    budget_requests_collection.insert_one(document)


def fetch_request(request_id: UUID) -> dict | None:
    """
    Fetch a previously generated budget request by its UUID.

    Args:
        request_id: UUID from the original /generate response.

    Returns:
        The stored document dict, or None if not found.
    """
    return budget_requests_collection.find_one({"_id": str(request_id)})


def update_last_refreshed(request_id: UUID) -> None:
    """
    Update the lastUpdatedAt timestamp after a refresh operation.

    Args:
        request_id: UUID of the request to update.
    """
    budget_requests_collection.update_one(
        {"_id": str(request_id)},
        {"$set": {"lastUpdatedAt": datetime.now(timezone.utc).isoformat()}},
    )
