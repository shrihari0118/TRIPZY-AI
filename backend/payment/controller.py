from payment.models import (
    CreateOrderRequest,
    CreateOrderResponse,
    CreateTransportOrderRequest,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
)
from payment import service as payment_service


def handle_create_order(request: CreateOrderRequest) -> CreateOrderResponse:
    order = payment_service.create_full_order(
        legacy_amount=request.amount,
        total_amount=request.totalAmount,
        transport_amount=request.transportAmount,
        trip_id=request.trip_id,
    )
    return CreateOrderResponse(**order)


def handle_create_transport_order(
    request: CreateTransportOrderRequest,
) -> CreateOrderResponse:
    order = payment_service.create_transport_order(
        amount_rupees=request.amount,
        total_amount=request.totalAmount,
        trip_id=request.trip_id,
    )
    return CreateOrderResponse(**order)


def handle_verify_payment(request: VerifyPaymentRequest) -> VerifyPaymentResponse:
    result = payment_service.verify_payment(
        razorpay_order_id=request.razorpay_order_id,
        razorpay_payment_id=request.razorpay_payment_id,
        razorpay_signature=request.razorpay_signature,
        payment_type=request.payment_type,
        trip_id=request.trip_id,
    )
    return VerifyPaymentResponse(**result)
