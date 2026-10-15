from typing import Literal

from pydantic import BaseModel, Field


PaymentType = Literal["transport", "full"]
PaymentStatus = Literal["pending", "created", "confirmed", "verification_failed"]


class CreateOrderRequest(BaseModel):
    amount: float | None = Field(
        default=None,
        gt=0,
        description="Legacy fallback amount in rupees.",
    )
    totalAmount: float | None = Field(
        default=None,
        gt=0,
        description="Total trip amount in rupees before transport deduction.",
    )
    transportAmount: float | None = Field(
        default=None,
        ge=0,
        description="Selected transport amount in rupees.",
    )
    trip_id: str | None = Field(default=None, min_length=1)


class CreateTransportOrderRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Transport amount in rupees.")
    totalAmount: float | None = Field(
        default=None,
        gt=0,
        description="Total trip amount in rupees before transport deduction.",
    )
    trip_id: str | None = Field(default=None, min_length=1)


class PaymentPaidFlags(BaseModel):
    transport: bool = False
    full: bool = False


class TripPaymentState(BaseModel):
    totalAmount: float = Field(default=0, ge=0)
    transportAmount: float = Field(default=0, ge=0)
    paid: PaymentPaidFlags = Field(default_factory=PaymentPaidFlags)


class CreateOrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str
    payment: TripPaymentState
    payment_status: PaymentStatus
    payment_type: PaymentType


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str = Field(..., min_length=1)
    razorpay_payment_id: str = Field(..., min_length=1)
    razorpay_signature: str = Field(..., min_length=1)
    payment_type: PaymentType = "full"
    trip_id: str | None = Field(default=None, min_length=1)


class VerifyPaymentResponse(BaseModel):
    success: bool
    payment_status: PaymentStatus
    message: str
    payment: TripPaymentState
    payment_type: PaymentType
