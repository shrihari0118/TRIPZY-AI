import { useEffect } from 'react';
import TransportContainer from '../../components/transport/TransportContainer';
import ItineraryLayout from '../../components/ItineraryLayout';
import { useTripContext } from '../../context/TripContext';

export default function TransportPage() {
  const { selectedTrip, showTransportPaidOverlay, setShowTransportPaidOverlay } = useTripContext();

  useEffect(() => {
    if (!showTransportPaidOverlay) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShowTransportPaidOverlay(false);
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [setShowTransportPaidOverlay, showTransportPaidOverlay]);

  if (!selectedTrip) {
    return (
      <ItineraryLayout title="Transport Details" previousPath="/budget-results">
        <EmptyState message="No itinerary selected. Please choose a budget plan first." />
      </ItineraryLayout>
    );
  }

  return (
    <>
      {showTransportPaidOverlay && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/70">
          <div className="rounded-3xl border border-emerald-200 bg-white px-10 py-8 text-center shadow-xl">
            <p className="text-4xl font-semibold tracking-[0.2em] text-emerald-700">PAID ✅</p>
          </div>
        </div>
      )}

      <ItineraryLayout
        title="Transport Details"
        previousPath="/budget-results"
        nextPath="/itinerary/accommodation"
      >
        <TransportContainer />
      </ItineraryLayout>
    </>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <section className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--panel-muted)] p-8 text-center text-sm text-[var(--muted)]">
      {message}
    </section>
  );
}
