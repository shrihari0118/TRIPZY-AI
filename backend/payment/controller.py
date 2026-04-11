from payment.models import (
    CreateOrderRequest,
    CreateOrderResponse,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
)
from payment import service as payment_service


def handle_create_order(request: CreateOrderRequest) -> CreateOrderResponse:
    order = payment_service.create_order(request.amount, request.trip_id)
    return CreateOrderResponse(**order)


def handle_verify_payment(request: VerifyPaymentRequest) -> VerifyPaymentResponse:
    result = payment_service.verify_payment(
        razorpay_order_id=request.razorpay_order_id,
        razorpay_payment_id=request.razorpay_payment_id,
        razorpay_signature=request.razorpay_signature,
        trip_id=request.trip_id,
    )
    return VerifyPaymentResponse(**result)
