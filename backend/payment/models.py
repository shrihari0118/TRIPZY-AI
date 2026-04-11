from typing import Literal

from pydantic import BaseModel, Field


PaymentStatus = Literal["pending", "created", "confirmed", "verification_failed"]


class CreateOrderRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Amount in rupees.")
    trip_id: str | None = Field(default=None, min_length=1)


class CreateOrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str = Field(..., min_length=1)
    razorpay_payment_id: str = Field(..., min_length=1)
    razorpay_signature: str = Field(..., min_length=1)
    trip_id: str | None = Field(default=None, min_length=1)


class VerifyPaymentResponse(BaseModel):
    success: bool
    payment_status: PaymentStatus
    message: str
