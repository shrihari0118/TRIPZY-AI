import hashlib
import hmac
import logging
import os
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any

from bson import ObjectId
from fastapi import HTTPException

from database import db
from shared import config as _shared_config  # noqa: F401


budget_requests_collection = db["budget_requests"]
logger = logging.getLogger("tripzy.payment")


def create_order(amount_rupees: float, trip_id: str | None = None) -> dict[str, Any]:
    try:
        client = _get_razorpay_client()
        amount_paise = _to_paise(amount_rupees)

        payload: dict[str, Any] = {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": _build_receipt(trip_id),
        }
        if trip_id:
            _get_trip_document(trip_id)
            payload["notes"] = {"trip_id": trip_id}

        logger.info(
            "CREATE ORDER: before Razorpay call payload=%s",
            payload,
        )
        order = client.order.create(payload)
        logger.info(
            "CREATE ORDER: Razorpay response=%s",
            _sanitize_razorpay_response(order),
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("CREATE ORDER ERROR: %s", str(exc))
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if trip_id:
        _mark_order_created(trip_id, order)

    return _build_create_order_response(order)


def verify_payment(
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    trip_id: str | None = None,
) -> dict[str, Any]:
    secret = _get_razorpay_secret()

    if trip_id:
        trip_document = _get_trip_document(trip_id)
        expected_order_id = trip_document.get("payment", {}).get("order_id")
        if expected_order_id and expected_order_id != razorpay_order_id:
            _mark_payment_failed(
                trip_id=trip_id,
                order_id=razorpay_order_id,
                reason="Order ID does not match the generated trip payment order.",
            )
            return {
                "success": False,
                "payment_status": "verification_failed",
                "message": "Order mismatch detected during payment verification.",
            }

    body = f"{razorpay_order_id}|{razorpay_payment_id}".encode()
    expected_signature = hmac.new(
        secret.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    is_valid = hmac.compare_digest(expected_signature, razorpay_signature)

    if not is_valid:
        _mark_payment_failed(
            trip_id=trip_id,
            order_id=razorpay_order_id,
            reason="Razorpay signature verification failed.",
        )
        return {
            "success": False,
            "payment_status": "verification_failed",
            "message": "Payment verification failed.",
        }

    _mark_payment_confirmed(
        trip_id=trip_id,
        order_id=razorpay_order_id,
        payment_id=razorpay_payment_id,
        signature=razorpay_signature,
    )
    return {
        "success": True,
        "payment_status": "confirmed",
        "message": "Payment verified successfully.",
    }


def _get_razorpay_client() -> Any:
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = _get_razorpay_secret()

    if not key_id:
        logger.error("RAZORPAY_KEY_ID is missing. Check backend/.env or process environment.")
        raise HTTPException(status_code=500, detail="RAZORPAY_KEY_ID is not configured.")

    try:
        import razorpay
    except ImportError as exc:
        logger.exception("Razorpay SDK import failed.")
        raise HTTPException(
            status_code=500,
            detail="Razorpay SDK is not installed on the backend.",
        ) from exc

    return razorpay.Client(auth=(key_id, key_secret))


def _get_razorpay_secret() -> str:
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")
    if not key_secret:
        logger.error("RAZORPAY_KEY_SECRET is missing. Check backend/.env or process environment.")
        raise HTTPException(status_code=500, detail="RAZORPAY_KEY_SECRET is not configured.")

    return key_secret


def _to_paise(amount_rupees: float) -> int:
    try:
        normalized_amount = Decimal(str(amount_rupees)).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Amount must be a valid number.") from exc

    if not normalized_amount.is_finite():
        raise HTTPException(status_code=400, detail="Amount must be a valid number.")

    if normalized_amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero.")

    amount_paise = int(
        (normalized_amount * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    )
    if amount_paise <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero.")

    return amount_paise


def _build_create_order_response(order: dict[str, Any]) -> dict[str, Any]:
    try:
        order_id = str(order["id"])
        amount = int(order["amount"])
        currency = str(order.get("currency", "INR"))
    except (KeyError, TypeError, ValueError) as exc:
        logger.exception("Invalid Razorpay response payload: %s", order)
        raise HTTPException(
            status_code=500,
            detail="Invalid Razorpay order response.",
        ) from exc

    return {
        "order_id": order_id,
        "amount": amount,
        "currency": currency,
    }


def _sanitize_razorpay_response(order: Any) -> dict[str, Any]:
    if not isinstance(order, dict):
        return {"raw_type": type(order).__name__}

    return {
        "id": order.get("id"),
        "amount": order.get("amount"),
        "currency": order.get("currency"),
        "status": order.get("status"),
        "receipt": order.get("receipt"),
    }


def _build_receipt(trip_id: str | None) -> str:
    suffix = (trip_id or datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S"))[-24:]
    return f"tripzy_{suffix}"[:40]


def _get_trip_document(trip_id: str) -> dict[str, Any]:
    object_id = _parse_trip_id(trip_id)
    document = budget_requests_collection.find_one({"_id": object_id})
    if not document:
        raise HTTPException(status_code=404, detail="Trip not found for payment.")

    return document


def _parse_trip_id(trip_id: str) -> ObjectId:
    try:
        return ObjectId(trip_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid trip_id.") from exc


def _mark_order_created(trip_id: str, order: dict[str, Any]) -> None:
    result = budget_requests_collection.update_one(
        {"_id": _parse_trip_id(trip_id)},
        {
            "$set": {
                "payment.status": "created",
                "payment.order_id": order["id"],
                "payment.amount": int(order["amount"]),
                "payment.currency": order.get("currency", "INR"),
                "payment.updated_at": _timestamp(),
                "payment.error": None,
            }
        },
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Trip not found for payment.")


def _mark_payment_confirmed(
    *,
    trip_id: str | None,
    order_id: str,
    payment_id: str,
    signature: str,
) -> None:
    budget_requests_collection.update_one(
        _build_trip_filter(trip_id, order_id),
        {
            "$set": {
                "payment.status": "confirmed",
                "payment.order_id": order_id,
                "payment.payment_id": payment_id,
                "payment.signature": signature,
                "payment.confirmed_at": _timestamp(),
                "payment.updated_at": _timestamp(),
                "payment.error": None,
            }
        },
    )


def _mark_payment_failed(
    *,
    trip_id: str | None,
    order_id: str,
    reason: str,
) -> None:
    budget_requests_collection.update_one(
        _build_trip_filter(trip_id, order_id),
        {
            "$set": {
                "payment.status": "verification_failed",
                "payment.order_id": order_id,
                "payment.updated_at": _timestamp(),
                "payment.error": reason,
            }
        },
    )


def _build_trip_filter(trip_id: str | None, order_id: str) -> dict[str, Any]:
    if trip_id:
        return {"_id": _parse_trip_id(trip_id)}

    return {"payment.order_id": order_id}


def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()
