import {
  BusFront,
  MapPinned,
  Plane,
  Route,
  TrainFront,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTripContext } from '../../context/TripContext';
import { formatInr, getRecommendedFareOption } from '../../utils/pricingUtils';
import FareSelector from './FareSelector';
import SeatLayout from './SeatLayout';
import Timeline from './Timeline';

const MODE_META: Record<
  'bus' | 'train' | 'flight',
  { label: string; description: string; icon: LucideIcon }
> = {
  bus: {
    label: 'Bus Transfer',
    description: 'Pick traveller seats with live pricing and operator-level availability.',
    icon: BusFront,
  },
  train: {
    label: 'Train Transfer',
    description: 'Choose the fare tier that best fits your comfort and availability window.',
    icon: TrainFront,
  },
  flight: {
    label: 'Flight Transfer',
    description: 'Compare cabin fares and lock the best available option for every traveller.',
    icon: Plane,
  },
};

export default function TransportContainer() {
  const navigate = useNavigate();
  const {
    selectedTrip,
    transportItinerary,
    selectedSeats,
    selectedFare,
    travellersCount,
    selectionLimit,
    toggleSeat,
    selectFare,
    calculateTotalPrice,
    paymentState,
    isTransportLocked,
  } = useTripContext();

  if (!selectedTrip || !transportItinerary) {
    return null;
  }

  const modeMeta = MODE_META[transportItinerary.mode];
  const ModeIcon = modeMeta.icon;
  const totalPrice = calculateTotalPrice();
  const recommendedFare = getRecommendedFareOption(transportItinerary.fareOptions);
  const availableSeatCount = transportItinerary.seats.filter((seat) => !seat.isBooked).length;
  const availableFareCount = transportItinerary.fareOptions.filter(
    (fare) => fare.availability !== 'Not Available'
  ).length;
  const selectionSummary =
    transportItinerary.mode === 'bus'
      ? `${selectedSeats.length} of ${selectionLimit} seats selected`
      : selectedFare
        ? `${selectedFare.type} fare selected`
        : 'Select a fare tier';
  const transportCardDescription = paymentState.paid.full
    ? 'Trip payment is complete. Transport selection is now locked.'
    : paymentState.paid.transport
    ? 'Transport payment verified. Selection is now locked.'
    : transportItinerary.mode === 'bus'
      ? 'Seat total updates instantly as travellers are selected.'
      : 'Fare total reflects the selected tier across the full traveller count.';

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--panel)] shadow-sm">
          <div className="bg-[linear-gradient(135deg,rgba(15,118,110,0.12),rgba(14,116,144,0.08),rgba(255,255,255,0.95))] p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)] shadow-sm">
                  <ModeIcon className="h-4 w-4" />
                  {modeMeta.label}
                </span>
                <h2 className="mt-4 text-2xl font-semibold text-[var(--ink)] md:text-[2rem]">
                  {selectedTrip.result.transport.name}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                  {modeMeta.description}
                </p>
              </div>

              <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  Live Total
                </p>
                <p className="mt-2 text-3xl font-semibold text-[var(--ink)]">
                  {formatInr(totalPrice)}
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">{selectionSummary}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-t border-[var(--border)] p-6 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Route}
              label="Route"
              value={`${selectedTrip.source} to ${selectedTrip.destination}`}
            />
            <MetricCard
              icon={MapPinned}
              label="Distance"
              value={`${selectedTrip.distance_km.toLocaleString('en-IN')} km`}
            />
            <MetricCard
              icon={Users}
              label="Travellers"
              value={`${travellersCount} ${travellersCount === 1 ? 'traveller' : 'travellers'}`}
            />
            <MetricCard
              icon={Wallet}
              label="Availability"
              value={
                transportItinerary.mode === 'bus'
                  ? `${availableSeatCount} seats open`
                  : `${availableFareCount} fare tiers open`
              }
            />
          </div>
        </section>

        <section className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                Transport Selection
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-[var(--ink)]">
                {transportItinerary.mode === 'bus' ? 'Choose Seats' : 'Choose Fare'}
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                {isTransportLocked
                  ? 'Transport payment locks the confirmed seats or fare so this selection cannot be changed.'
                  : transportItinerary.mode === 'bus'
                  ? `Booked seats stay locked. You can choose up to ${selectionLimit} traveller seats.`
                  : 'Recommended fares are highlighted, and unavailable options remain disabled.'}
              </p>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel-muted)] px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Current Pick</p>
              <p className="mt-1 text-lg font-semibold text-[var(--ink)]">{selectionSummary}</p>
            </div>
          </div>

          {transportItinerary.mode === 'bus' ? (
            <SeatLayout
              seatLayout={transportItinerary.seatLayout}
              seats={transportItinerary.seats}
              selectedSeats={selectedSeats}
              selectionLimit={selectionLimit}
              isLocked={isTransportLocked}
              onToggleSeat={toggleSeat}
            />
          ) : (
            <FareSelector
              fareOptions={transportItinerary.fareOptions}
              selectedFareType={selectedFare?.type ?? null}
              recommendedFareType={recommendedFare?.type ?? null}
              travellersCount={travellersCount}
              isLocked={isTransportLocked}
              onSelectFare={selectFare}
            />
          )}

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <section className="rounded-[28px] border border-[var(--border)] bg-[var(--panel-muted)] px-5 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Selection Details
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--ink)]">
                {transportItinerary.mode === 'bus'
                  ? selectedSeats.length > 0
                    ? selectedSeats.map((seat) => `${seat.id} (${seat.type})`).join(', ')
                    : 'No seats selected yet.'
                  : selectedFare
                    ? `${selectedFare.type} fare for ${travellersCount} travellers`
                    : 'No fare selected yet.'}
              </p>
            </section>

            <button
              type="button"
              onClick={() => navigate('/transport-payment')}
              disabled={isTransportLocked || totalPrice <= 0}
              className="rounded-[28px] border border-[var(--border)] bg-[var(--ink)] px-5 py-4 text-left text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:translate-y-0"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Total Payable</p>
              <p className="mt-2 text-3xl font-semibold">{formatInr(totalPrice)}</p>
              <p className="mt-2 text-sm text-white/70">
                {transportCardDescription}
              </p>
            </button>
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
            Journey Snapshot
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <SnapshotCard
              label="Boarding Points"
              value={transportItinerary.boardingPoints.length}
              caption="Pickup windows from Gemini"
            />
            <SnapshotCard
              label="Intermediate Stops"
              value={transportItinerary.intermediateStops.length}
              caption="Route halts from Gemini"
            />
            <SnapshotCard
              label="Dropping Points"
              value={transportItinerary.droppingPoints.length}
              caption="Arrival windows from Gemini"
            />
          </div>
        </section>

        <Timeline items={transportItinerary.timeline} />
      </div>
    </section>
  );
}

function MetricCard({
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
      <p className="mt-3 text-base font-semibold text-[var(--ink)]">{value}</p>
    </div>
  );
}

function SnapshotCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: number;
  caption: string;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--panel-muted)] px-4 py-4">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[var(--ink)]">{value}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{caption}</p>
    </div>
  );
}
