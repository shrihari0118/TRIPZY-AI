import { ArrowRight, CreditCard, ShieldCheck, Wallet, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ItineraryLayout from '../components/ItineraryLayout';
import { useTripContext } from '../context/TripContext';
import { useTransportPayment } from '../hooks/useTransportPayment';
import { formatInr } from '../utils/pricingUtils';
import { getRemainingTripPayableAmount } from '../utils/tripPayment';

export default function TransportPaymentPage() {
  const navigate = useNavigate();
  const { selectedTrip, paymentState } = useTripContext();
  const {
    formattedTransportAmount,
    paymentStatus,
    isProcessing,
    isConfirmed,
    isTripFullyPaid,
    canPay,
    buttonLabel,
    errorMessage,
    startPayment,
  } = useTransportPayment();

  if (!selectedTrip) {
    return (
      <ItineraryLayout title="Transport Payment" previousPath="/itinerary/transport" showPayButton={false}>
        <EmptyState message="No itinerary selected. Please choose a budget plan first." />
      </ItineraryLayout>
    );
  }

  const remainingAmount = getRemainingTripPayableAmount(paymentState);
  const remainingAfterTransport = paymentState.paid.full
    ? 0
    : isConfirmed
      ? remainingAmount
      : Math.max(0, paymentState.totalAmount - paymentState.transportAmount);
  const statusLabel = isTripFullyPaid
    ? 'Trip Paid'
    : isConfirmed
      ? 'Transport Paid'
      : paymentStatus === 'verification_failed'
        ? 'Retry Available'
        : paymentStatus === 'created'
          ? 'Order Created'
          : 'Pending';

  return (
    <ItineraryLayout title="Transport Payment" previousPath="/itinerary/transport" showPayButton={false}>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm md:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Secure Checkout</p>
          <h2 className="mt-3 text-3xl font-semibold text-[var(--ink)]">Pay only for transport</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            This checkout creates a dedicated Razorpay order for your selected seats or fare. Once
            it is verified, the same transport amount is deducted from the final trip payment.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <SummaryCard
              icon={Wallet}
              label="Transport Amount"
              value={formattedTransportAmount}
            />
            <SummaryCard
              icon={CreditCard}
              label="Trip Total"
              value={formatInr(paymentState.totalAmount)}
            />
            <SummaryCard
              icon={ShieldCheck}
              label="Remaining Later"
              value={formatInr(remainingAfterTransport)}
            />
          </div>

          {errorMessage && (
            <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={async () => {
                const isSuccessful = await startPayment();
                if (isSuccessful) {
                  navigate('/itinerary/transport');
                }
              }}
              disabled={!canPay}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:translate-y-0"
            >
              <CreditCard className="h-4 w-4" />
              {buttonLabel}
            </button>

            <button
              type="button"
              onClick={() => navigate('/itinerary/transport')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:-translate-y-0.5"
            >
              Back to Transport
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Payment State</p>
          <div className="mt-5 space-y-4">
            <StatusRow label="Trip" value={`${selectedTrip.source} to ${selectedTrip.destination}`} />
            <StatusRow label="Transport Paid" value={paymentState.paid.transport ? 'Yes' : 'No'} />
            <StatusRow label="Full Paid" value={paymentState.paid.full ? 'Yes' : 'No'} />
            <StatusRow label="Checkout Status" value={statusLabel} />
            <StatusRow
              label="Interaction Lock"
              value={paymentState.paid.transport || paymentState.paid.full ? 'Locked' : 'Open'}
            />
          </div>

          <p className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] px-4 py-3 text-sm text-[var(--muted)]">
            {isConfirmed
              ? 'Transport is already paid. Return to the itinerary to continue the remaining trip payment.'
              : isTripFullyPaid
                ? 'The full trip is already paid, so transport checkout is no longer needed.'
                : isProcessing
                  ? 'Waiting for Razorpay checkout and backend verification to finish.'
                  : 'If the payment fails or is dismissed, you can retry from this page.'}
          </p>
        </section>
      </section>
    </ItineraryLayout>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <section className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--panel-muted)] p-8 text-center text-sm text-[var(--muted)]">
      {message}
    </section>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--panel-muted)] px-4 py-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
        <Icon className="h-4 w-4 text-[var(--accent)]" />
        {label}
      </div>
      <p className="mt-3 text-2xl font-semibold text-[var(--ink)]">{value}</p>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] px-4 py-3 text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-semibold text-[var(--ink)]">{value}</span>
    </div>
  );
}
