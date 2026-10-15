import { useState } from 'react';
import {
  createTransportPaymentOrder,
  verifyPayment,
} from '../api/payment';
import { useTripContext } from '../context/TripContext';
import { formatInr } from '../utils/pricingUtils';
import { loadRazorpayScript, openRazorpayCheckout } from '../utils/razorpay';

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

export function useTransportPayment() {
  const {
    selectedTrip,
    paymentState,
    setPaymentState,
    transportPaymentStatus,
    setTransportPaymentStatus,
    setShowTransportPaidOverlay,
  } = useTripContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const transportAmount = paymentState.transportAmount;
  const isConfirmed = paymentState.paid.transport;
  const isTripFullyPaid = paymentState.paid.full;
  const canPay =
    Boolean(selectedTrip) &&
    transportAmount > 0 &&
    !isProcessing &&
    !isConfirmed &&
    !isTripFullyPaid;
  const buttonLabel = isProcessing
    ? 'Preparing Payment...'
    : isTripFullyPaid
      ? 'Trip Already Paid'
      : isConfirmed
        ? 'Transport Paid'
        : transportPaymentStatus === 'verification_failed'
          ? 'Retry Transport Payment'
          : 'Pay Transport Now';

  const startPayment = async (): Promise<boolean> => {
    if (!selectedTrip) {
      setErrorMessage('Select a trip plan before starting transport payment.');
      return false;
    }

    if (paymentState.paid.full) {
      setErrorMessage('The full trip is already paid.');
      return false;
    }

    if (paymentState.paid.transport) {
      setErrorMessage('Transport payment has already been completed.');
      return false;
    }

    if (transportAmount <= 0) {
      setErrorMessage('Select seats or a fare before paying for transport.');
      return false;
    }

    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID?.trim();
    if (!razorpayKey || razorpayKey === 'your_test_key_id') {
      setErrorMessage('Configure VITE_RAZORPAY_KEY_ID with your Razorpay test key.');
      return false;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        throw new Error('Razorpay checkout could not be loaded.');
      }

      const order = await createTransportPaymentOrder({
        amount: transportAmount,
        totalAmount: paymentState.totalAmount,
        trip_id: selectedTrip.trip_id,
      });
      setPaymentState(order.payment);
      setTransportPaymentStatus('created');

      const paymentResponse = await openRazorpayCheckout({
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: 'Tripzy AI',
        description: 'Transport Payment',
        prefill: {
          name: getCustomerName(),
        },
        notes: {
          trip_id: selectedTrip.trip_id ?? '',
          destination: selectedTrip.destination,
          budget_type: selectedTrip.budget_type,
          payment_type: 'transport',
        },
        theme: {
          color: '#0f766e',
        },
      });

      const verification = await verifyPayment({
        ...paymentResponse,
        payment_type: 'transport',
        trip_id: selectedTrip.trip_id,
      });
      setPaymentState(verification.payment);

      if (!verification.success) {
        setTransportPaymentStatus(verification.payment_status);
        setErrorMessage(verification.message);
        return false;
      }

      setTransportPaymentStatus('confirmed');
      setShowTransportPaidOverlay(true);
      return true;
    } catch (error) {
      console.error('[payment] Transport payment failed', error);
      setTransportPaymentStatus('verification_failed');
      setErrorMessage(getErrorMessage(error));
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    transportAmount,
    formattedTransportAmount: formatInr(transportAmount),
    paymentState,
    paymentStatus: transportPaymentStatus,
    isProcessing,
    isConfirmed,
    isTripFullyPaid,
    canPay,
    buttonLabel,
    errorMessage,
    startPayment,
  };
}
