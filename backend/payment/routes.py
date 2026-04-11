import logging

from fastapi import APIRouter, HTTPException

from payment import controller as payment_controller
from payment.models import (
    CreateOrderRequest,
    CreateOrderResponse,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
)


router = APIRouter(prefix="/api/payment", tags=["payment"])
logger = logging.getLogger("tripzy.payment")


def _model_dump(model: object) -> object:
    if hasattr(model, "model_dump"):
        return model.model_dump()  # type: ignore[no-any-return]
    if hasattr(model, "dict"):
        return model.dict()  # type: ignore[no-any-return]
    return model


@router.post("/create-order", response_model=CreateOrderResponse)
def create_order(payload: CreateOrderRequest) -> CreateOrderResponse:
    request_payload = _model_dump(payload)
    logger.info("API HIT POST /api/payment/create-order payload=%s", request_payload)

    try:
        response = payment_controller.handle_create_order(payload)
        logger.info(
            "CREATE ORDER API response payload=%s",
            _model_dump(response),
        )
        return response
    except HTTPException as exc:
        logger.error(
            "CREATE ORDER ERROR status=%s detail=%s",
            exc.status_code,
            exc.detail,
        )
        raise
    except Exception as exc:
        logger.exception("CREATE ORDER ERROR: %s", str(exc))
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/verify", response_model=VerifyPaymentResponse)
def verify_payment(request: VerifyPaymentRequest) -> VerifyPaymentResponse:
    return payment_controller.handle_verify_payment(request)
