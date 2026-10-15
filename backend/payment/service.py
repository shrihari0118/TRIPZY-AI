import hashlib
import hmac
import logging
import os
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any, Literal

from bson import ObjectId
from fastapi import HTTPException

from database import db
from shared import config as _shared_config  # noqa: F401


budget_requests_collection = db["budget_requests"]
logger = logging.getLogger("tripzy.payment")

PAYMENT_TYPE_FULL = "full"
PAYMENT_TYPE_TRANSPORT = "transport"
PaymentType = Literal["transport", "full"]

# Current flow analysis (2026-04-13):
# - The frontend "Pay Now" flow used the midpoint of result.total_budget as the trip total.
# - The transport amount was only derived in frontend seat/fare selection state.
# - Razorpay order creation and verification previously tracked one trip-wide order only.
# Partial payments now store the same totalAmount/transportAmount/paid shape on the trip
# document while keeping separate Razorpay records for transport and full settlement.


def create_full_order(
    *,
    legacy_amount: float | None = None,
    total_amount: float | None = None,
    transport_amount: float | None = None,
    trip_id: str | None = None,
) -> dict[str, Any]:
    trip_document = _get_trip_document(trip_id) if trip_id else None
    payment_state = build_public_payment_state(trip_document)

    if payment_state["paid"]["full"]:
        raise HTTPException(status_code=409, detail="Full payment has already been completed.")

    resolved_total_amount = _resolve_total_amount(
        requested_total=total_amount,
        trip_document=trip_document,
        payment_state=payment_state,
        fallback_amount=legacy_amount,
    )
    resolved_transport_amount = _resolve_transport_amount(
        requested_transport=transport_amount,
        payment_state=payment_state,
    )
    deducted_transport = (
        min(resolved_transport_amount, resolved_total_amount)
        if payment_state["paid"]["transport"]
        else 0.0
    )
    final_amount = _round_amount(resolved_total_amount - deducted_transport)

    if final_amount <= 0:
        raise HTTPException(status_code=400, detail="No remaining balance for full payment.")

    order = _create_order_in_razorpay(final_amount, trip_id, PAYMENT_TYPE_FULL)

    if trip_id:
        payment_state["totalAmount"] = resolved_total_amount
        payment_state["transportAmount"] = resolved_transport_amount
        _mark_order_created(
            trip_id=trip_id,
            order=order,
            payment_type=PAYMENT_TYPE_FULL,
            payment_state=payment_state,
        )
        payment_state = _get_payment_snapshot(trip_id)

    return {
        **_build_create_order_response(order),
        "payment": payment_state,
        "payment_status": "created",
        "payment_type": PAYMENT_TYPE_FULL,
    }


def create_transport_order(
    *,
    amount_rupees: float,
    total_amount: float | None = None,
    trip_id: str | None = None,
) -> dict[str, Any]:
    trip_document = _get_trip_document(trip_id) if trip_id else None
    payment_state = build_public_payment_state(trip_document)

    if payment_state["paid"]["full"]:
        raise HTTPException(status_code=409, detail="Trip is already fully paid.")
    if payment_state["paid"]["transport"]:
        raise HTTPException(status_code=409, detail="Transport payment has already been completed.")

    resolved_total_amount = _resolve_total_amount(
        requested_total=total_amount,
        trip_document=trip_document,
        payment_state=payment_state,
        fallback_amount=None,
    )
    resolved_transport_amount = _round_amount(amount_rupees)
    order = _create_order_in_razorpay(
        resolved_transport_amount,
        trip_id,
        PAYMENT_TYPE_TRANSPORT,
    )

    if trip_id:
        payment_state["totalAmount"] = resolved_total_amount
        payment_state["transportAmount"] = resolved_transport_amount
        _mark_order_created(
            trip_id=trip_id,
            order=order,
            payment_type=PAYMENT_TYPE_TRANSPORT,
            payment_state=payment_state,
        )
        payment_state = _get_payment_snapshot(trip_id)

    return {
        **_build_create_order_response(order),
        "payment": payment_state,
        "payment_status": "created",
        "payment_type": PAYMENT_TYPE_TRANSPORT,
    }


def verify_payment(
    *,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    payment_type: PaymentType = PAYMENT_TYPE_FULL,
    trip_id: str | None = None,
) -> dict[str, Any]:
    secret = _get_razorpay_secret()
    trip_document = _get_trip_document(trip_id) if trip_id else None

    expected_order_id = _get_expected_order_id(trip_document, payment_type)
    if expected_order_id and expected_order_id != razorpay_order_id:
        _mark_payment_failed(
            trip_id=trip_id,
            order_id=razorpay_order_id,
            payment_type=payment_type,
            reason="Order ID does not match the generated payment order.",
        )
        return {
            "success": False,
            "payment_status": "verification_failed",
            "message": "Order mismatch detected during payment verification.",
            "payment": _get_payment_snapshot(trip_id, trip_document),
            "payment_type": payment_type,
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
            payment_type=payment_type,
            reason="Razorpay signature verification failed.",
        )
        return {
            "success": False,
            "payment_status": "verification_failed",
            "message": "Payment verification failed.",
            "payment": _get_payment_snapshot(trip_id, trip_document),
            "payment_type": payment_type,
        }

    _mark_payment_confirmed(
        trip_id=trip_id,
        order_id=razorpay_order_id,
        payment_id=razorpay_payment_id,
        signature=razorpay_signature,
        payment_type=payment_type,
    )
    return {
        "success": True,
        "payment_status": "confirmed",
        "message": "Payment verified successfully.",
        "payment": _get_payment_snapshot(trip_id, trip_document),
        "payment_type": payment_type,
    }


def build_public_payment_state(trip_document: dict[str, Any] | None) -> dict[str, Any]:
    payment_document = trip_document.get("payment", {}) if isinstance(trip_document, dict) else {}
    if not isinstance(payment_document, dict):
        payment_document = {}

    paid_document = payment_document.get("paid", {})
    if not isinstance(paid_document, dict):
        paid_document = {}

    total_amount = _sanitize_amount(
        payment_document.get("totalAmount"),
        fallback=_derive_total_amount_from_trip(trip_document),
    )
    transport_amount = min(
        _sanitize_amount(payment_document.get("transportAmount"), fallback=0.0),
        total_amount if total_amount > 0 else _sanitize_amount(payment_document.get("transportAmount"), fallback=0.0),
    )

    transport_order = payment_document.get("transportOrder", {})
    full_order = payment_document.get("fullOrder", {})
    transport_status = str(transport_order.get("status", "")).lower() if isinstance(transport_order, dict) else ""
    full_status = str(full_order.get("status", "")).lower() if isinstance(full_order, dict) else ""
    legacy_status = str(payment_document.get("status", "")).lower()

    return {
        "totalAmount": total_amount,
        "transportAmount": transport_amount,
        "paid": {
            "transport": bool(paid_document.get("transport")) or transport_status == "confirmed",
            "full": bool(paid_document.get("full"))
            or full_status == "confirmed"
            or legacy_status == "confirmed",
        },
    }


def _get_payment_snapshot(
    trip_id: str | None,
    trip_document: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if trip_id:
        return build_public_payment_state(_get_trip_document(trip_id))

    return build_public_payment_state(trip_document)


def _create_order_in_razorpay(
    amount_rupees: float,
    trip_id: str | None,
    payment_type: PaymentType,
) -> dict[str, Any]:
    try:
        client = _get_razorpay_client()
        amount_paise = _to_paise(amount_rupees)

        payload: dict[str, Any] = {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": _build_receipt(trip_id, payment_type),
            "notes": {
                "payment_type": payment_type,
            },
        }
        if trip_id:
            _get_trip_document(trip_id)
            payload["notes"]["trip_id"] = trip_id

        logger.info(
            "CREATE ORDER: before Razorpay call payload=%s",
            payload,
        )
        order = client.order.create(payload)
        logger.info(
            "CREATE ORDER: Razorpay response=%s",
            _sanitize_razorpay_response(order),
        )
        return order
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("CREATE ORDER ERROR: %s", str(exc))
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def _resolve_total_amount(
    *,
    requested_total: float | None,
    trip_document: dict[str, Any] | None,
    payment_state: dict[str, Any],
    fallback_amount: float | None,
) -> float:
    total_from_request = _sanitize_amount(requested_total, fallback=0.0)
    if total_from_request > 0:
        return total_from_request

    total_from_state = _sanitize_amount(payment_state.get("totalAmount"), fallback=0.0)
    if total_from_state > 0:
        return total_from_state

    total_from_trip = _derive_total_amount_from_trip(trip_document)
    if total_from_trip > 0:
        return total_from_trip

    total_from_legacy = _sanitize_amount(fallback_amount, fallback=0.0)
    if total_from_legacy > 0:
        return total_from_legacy

    raise HTTPException(
        status_code=400,
        detail="A totalAmount or trip_id is required to create the order.",
    )


def _resolve_transport_amount(
    *,
    requested_transport: float | None,
    payment_state: dict[str, Any],
) -> float:
    transport_from_state = _sanitize_amount(payment_state.get("transportAmount"), fallback=0.0)
    if transport_from_state > 0:
        return transport_from_state

    return _sanitize_amount(requested_transport, fallback=0.0)


def _get_expected_order_id(
    trip_document: dict[str, Any] | None,
    payment_type: PaymentType,
) -> str | None:
    if not isinstance(trip_document, dict):
        return None

    payment_document = trip_document.get("payment", {})
    if not isinstance(payment_document, dict):
        return None

    order_record = payment_document.get(_order_record_key(payment_type), {})
    if isinstance(order_record, dict) and order_record.get("order_id"):
        return str(order_record["order_id"])

    if payment_type == PAYMENT_TYPE_FULL and payment_document.get("order_id"):
        return str(payment_document["order_id"])

    return None


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


def _build_receipt(trip_id: str | None, payment_type: PaymentType) -> str:
    suffix = (trip_id or datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S"))[-20:]
    return f"tripzy_{payment_type}_{suffix}"[:40]


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


def _mark_order_created(
    *,
    trip_id: str,
    order: dict[str, Any],
    payment_type: PaymentType,
    payment_state: dict[str, Any],
) -> None:
    record_key = _order_record_key(payment_type)
    updates: dict[str, Any] = {
        "payment.totalAmount": payment_state["totalAmount"],
        "payment.transportAmount": payment_state["transportAmount"],
        "payment.paid.transport": payment_state["paid"]["transport"],
        "payment.paid.full": payment_state["paid"]["full"],
        f"payment.{record_key}.status": "created",
        f"payment.{record_key}.order_id": order["id"],
        f"payment.{record_key}.amount": int(order["amount"]),
        f"payment.{record_key}.currency": order.get("currency", "INR"),
        f"payment.{record_key}.updated_at": _timestamp(),
        f"payment.{record_key}.error": None,
        "payment.updated_at": _timestamp(),
    }
    if payment_type == PAYMENT_TYPE_FULL:
        updates["payment.status"] = "created"
        updates["payment.order_id"] = order["id"]
        updates["payment.amount"] = int(order["amount"])
        updates["payment.currency"] = order.get("currency", "INR")
        updates["payment.error"] = None

    result = budget_requests_collection.update_one(
        {"_id": _parse_trip_id(trip_id)},
        {
            "$set": updates,
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
    payment_type: PaymentType,
) -> None:
    record_key = _order_record_key(payment_type)
    updates: dict[str, Any] = {
        f"payment.{record_key}.status": "confirmed",
        f"payment.{record_key}.order_id": order_id,
        f"payment.{record_key}.payment_id": payment_id,
        f"payment.{record_key}.signature": signature,
        f"payment.{record_key}.confirmed_at": _timestamp(),
        f"payment.{record_key}.updated_at": _timestamp(),
        f"payment.{record_key}.error": None,
        "payment.updated_at": _timestamp(),
        f"payment.paid.{payment_type}": True,
    }
    if payment_type == PAYMENT_TYPE_FULL:
        updates["payment.status"] = "confirmed"
        updates["payment.order_id"] = order_id
        updates["payment.payment_id"] = payment_id
        updates["payment.signature"] = signature
        updates["payment.confirmed_at"] = _timestamp()
        updates["payment.error"] = None

    budget_requests_collection.update_one(
        _build_trip_filter(trip_id, order_id, payment_type),
        {
            "$set": updates,
        },
    )


def _mark_payment_failed(
    *,
    trip_id: str | None,
    order_id: str,
    payment_type: PaymentType,
    reason: str,
) -> None:
    record_key = _order_record_key(payment_type)
    updates: dict[str, Any] = {
        f"payment.{record_key}.status": "verification_failed",
        f"payment.{record_key}.order_id": order_id,
        f"payment.{record_key}.updated_at": _timestamp(),
        f"payment.{record_key}.error": reason,
        "payment.updated_at": _timestamp(),
    }
    if payment_type == PAYMENT_TYPE_FULL:
        updates["payment.status"] = "verification_failed"
        updates["payment.order_id"] = order_id
        updates["payment.error"] = reason

    budget_requests_collection.update_one(
        _build_trip_filter(trip_id, order_id, payment_type),
        {
            "$set": updates,
        },
    )


def _build_trip_filter(
    trip_id: str | None,
    order_id: str,
    payment_type: PaymentType,
) -> dict[str, Any]:
    if trip_id:
        return {"_id": _parse_trip_id(trip_id)}

    if payment_type == PAYMENT_TYPE_FULL:
        return {
            "$or": [
                {"payment.fullOrder.order_id": order_id},
                {"payment.order_id": order_id},
            ]
        }

    return {f"payment.{_order_record_key(payment_type)}.order_id": order_id}


def _order_record_key(payment_type: PaymentType) -> str:
    return "transportOrder" if payment_type == PAYMENT_TYPE_TRANSPORT else "fullOrder"


def _derive_total_amount_from_trip(trip_document: dict[str, Any] | None) -> float:
    if not isinstance(trip_document, dict):
        return 0.0

    result = trip_document.get("result", {})
    if not isinstance(result, dict):
        return 0.0

    total_budget = result.get("total_budget", {})
    if not isinstance(total_budget, dict):
        return 0.0

    minimum = _sanitize_amount(total_budget.get("min"), fallback=0.0)
    maximum = max(minimum, _sanitize_amount(total_budget.get("max"), fallback=minimum))

    if minimum > 0 and maximum > 0:
        midpoint = (minimum + maximum) / 2
        return _round_amount(midpoint, whole_rupees=True)

    return _round_amount(max(minimum, maximum, 0.0), whole_rupees=True)


def _sanitize_amount(value: Any, *, fallback: float) -> float:
    if value is None:
        return fallback

    try:
        normalized_amount = Decimal(str(value)).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )
    except (InvalidOperation, TypeError, ValueError):
        return fallback

    if not normalized_amount.is_finite():
        return fallback

    return max(float(normalized_amount), 0.0)


def _round_amount(amount: float, *, whole_rupees: bool = False) -> float:
    quantizer = Decimal("1") if whole_rupees else Decimal("0.01")
    normalized_amount = Decimal(str(amount)).quantize(
        quantizer,
        rounding=ROUND_HALF_UP,
    )
    return max(float(normalized_amount), 0.0)


def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()
