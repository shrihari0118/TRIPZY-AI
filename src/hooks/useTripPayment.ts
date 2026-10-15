import { useState } from 'react';
import {
  createPaymentOrder,
  verifyPayment,
} from '../api/payment';
import { useTripContext } from '../context/TripContext';
import { formatInr } from '../utils/pricingUtils';
import { loadRazorpayScript, openRazorpayCheckout } from '../utils/razorpay';
import { getRemainingTripPayableAmount } from '../utils/tripPayment';

function getCustomerName(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const name = localStorage.getItem('name')?.trim();
  return name || undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Could not complete the payment flow.';
}

// Current flow analysis (2026-04-13):
// - "Pay Now" is still the shared full-payment CTA used by itinerary pages.
// - The payable amount is no longer the raw total budget midpoint; it is now the remaining
//   balance after a verified transport payment has been deducted on both frontend and backend.
export function useTripPayment() {
  const {
    selectedTrip,
    paymentState,
    setPaymentState,
    fullPaymentStatus,
    setFullPaymentStatus,
  } = useTripContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const hasTrip = Boolean(selectedTrip);
  const paymentAmount = getRemainingTripPayableAmount(paymentState);
  const formattedAmount = formatInr(paymentAmount);
  const isConfirmed = paymentState.paid.full;
  const canPay = hasTrip && paymentAmount > 0 && !isProcessing && !isConfirmed;
  const buttonLabel = isProcessing
    ? 'Preparing Payment...'
    : isConfirmed
      ? 'Trip Confirmed'
      : fullPaymentStatus === 'verification_failed'
        ? 'Retry Payment'
        : 'Pay Now';

  const startPayment = async () => {
    if (!selectedTrip) {
      setErrorMessage('Select a trip plan before starting payment.');
      return;
    }

    if (paymentAmount <= 0) {
      setErrorMessage('The remaining trip balance is already cleared.');
      return;
    }

    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID?.trim();
    if (!razorpayKey || razorpayKey === 'your_test_key_id') {
      setErrorMessage('Configure VITE_RAZORPAY_KEY_ID with your Razorpay test key.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        throw new Error('Razorpay checkout could not be loaded.');
      }

      const order = await createPaymentOrder({
        totalAmount: paymentState.totalAmount,
        transportAmount: paymentState.transportAmount,
        trip_id: selectedTrip.trip_id,
      });
      setPaymentState(order.payment);
      setFullPaymentStatus('created');

      const paymentResponse = await openRazorpayCheckout({
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: 'Tripzy AI',
        description: 'Trip Booking',
        prefill: {
          name: getCustomerName(),
        },
        notes: {
          trip_id: selectedTrip.trip_id ?? '',
          destination: selectedTrip.destination,
          budget_type: selectedTrip.budget_type,
          payment_type: 'full',
        },
        theme: {
          color: '#0f766e',
        },
      });

      const verification = await verifyPayment({
        ...paymentResponse,
        payment_type: 'full',
        trip_id: selectedTrip.trip_id,
      });
      setPaymentState(verification.payment);

      if (!verification.success) {
        setFullPaymentStatus(verification.payment_status);
        setErrorMessage(verification.message);
        return;
      }

      setFullPaymentStatus('confirmed');
      setSuccessMessage('Trip confirmed. Payment verified successfully.');
    } catch (error) {
      console.error('[payment] Payment flow failed', error);
      setFullPaymentStatus('verification_failed');
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    amount: paymentAmount,
    formattedAmount,
    paymentState,
    paymentStatus: fullPaymentStatus,
    hasTrip,
    isConfirmed,
    isProcessing,
    canPay,
    buttonLabel,
    errorMessage,
    successMessage:
      paymentState.paid.full
        ? successMessage ?? 'Trip confirmed. Payment verified successfully.'
        : successMessage,
    startPayment,
  };
}
