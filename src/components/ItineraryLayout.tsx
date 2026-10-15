import type { ReactNode } from 'react';
import { CheckCircle2, ShieldCheck, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTripPayment } from '../hooks/useTripPayment';

type ItineraryLayoutProps = {
  title: string;
  previousPath?: string;
  nextPath?: string;
  children: ReactNode;
  showPayButton?: boolean;
};

export default function ItineraryLayout({
  title,
  previousPath,
  nextPath,
  children,
  showPayButton = true,
}: ItineraryLayoutProps) {
  const navigate = useNavigate();
  const {
    formattedAmount,
    paymentState,
    paymentStatus,
    hasTrip,
    canPay,
    isConfirmed,
    buttonLabel,
    errorMessage,
    successMessage,
    startPayment,
  } = useTripPayment();

  const shouldShowPayButton = showPayButton && hasTrip;
  const statusLabel =
    paymentState.paid.full
      ? 'Confirmed'
      : paymentState.paid.transport
        ? 'Transport Paid'
      : paymentStatus === 'verification_failed'
        ? 'Verification Failed'
        : paymentStatus === 'created'
          ? 'Order Created'
          : 'Pending';
  const statusClasses =
    paymentState.paid.full
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : paymentState.paid.transport
        ? 'border-sky-200 bg-sky-50 text-sky-700'
      : paymentStatus === 'verification_failed'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-[var(--border)] bg-[var(--panel-muted)] text-[var(--muted)]';

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm md:p-8">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
              Itinerary
            </p>
            <h1 className="text-3xl font-semibold text-[var(--ink)]">{title}</h1>
          </div>
        </section>

        {children}

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
          {shouldShowPayButton && (
            <div className="mb-4 rounded-3xl border border-[var(--border)] bg-[var(--panel-muted)] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    <Wallet className="h-4 w-4 text-[var(--accent)]" />
                    Trip Booking Amount
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">{formattedAmount}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Secure Razorpay checkout in test mode with backend signature verification.
                    {paymentState.paid.transport
                      ? ' Transport payment is already deducted from the remaining balance.'
                      : ' Amount is derived from the selected plan estimate.'}
                  </p>
                </div>

                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses}`}
                >
                  {isConfirmed && <CheckCircle2 className="h-4 w-4" />}
                  {!isConfirmed && <ShieldCheck className="h-4 w-4" />}
                  {statusLabel}
                </span>
              </div>

              {successMessage && (
                <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMessage}
                </p>
              )}

              {errorMessage && (
                <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => previousPath && navigate(previousPath)}
              disabled={!previousPath}
              className="rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Back
            </button>

            {shouldShowPayButton && (
              <button
                type="button"
                onClick={startPayment}
                disabled={!canPay}
                className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:translate-y-0"
              >
                {buttonLabel}
              </button>
            )}

            <button
              type="button"
              onClick={() => nextPath && navigate(nextPath)}
              disabled={!nextPath}
              className="rounded-2xl bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
