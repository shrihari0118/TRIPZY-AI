import ItineraryLayout from '../../components/ItineraryLayout';
import { useTripContext } from '../../context/TripContext';

const TIME_SLOTS: Record<string, string[]> = {
  bus: ['06:30 AM', '01:15 PM', '09:45 PM'],
  train: ['05:40 AM', '12:20 PM', '08:55 PM'],
  flight: ['07:10 AM', '02:35 PM', '07:50 PM'],
};

export default function TransportPage() {
  const { selectedTrip } = useTripContext();

  if (!selectedTrip) {
    return (
      <ItineraryLayout title="Transport Details" previousPath="/budget-results">
        <EmptyState message="No itinerary selected. Please choose a budget plan first." />
      </ItineraryLayout>
    );
  }

  const mode = selectedTrip.result.transport.mode.trim().toLowerCase() || 'bus';
  const seatAvailability = 8 + ((selectedTrip.source.length + selectedTrip.destination.length) % 25);
  const boardingPoints = [
    `${selectedTrip.source} Central Boarding Point`,
    `${selectedTrip.source} Main Terminal`,
  ];
  const destinationPoints = [
    `${selectedTrip.destination} Arrival Point`,
    `${selectedTrip.destination} City Drop-off`,
  ];
  const timeSlots = TIME_SLOTS[mode] ?? ['08:00 AM', '02:00 PM', '08:00 PM'];

  return (
    <ItineraryLayout
      title="Transport Details"
      previousPath="/budget-results"
      nextPath="/itinerary/accommodation"
    >
      <section className="grid gap-6 lg:grid-cols-2">
        <InfoCard
          title="Selected Transport"
          items={[
            `Mode: ${selectedTrip.result.transport.mode}`,
            `Service: ${selectedTrip.result.transport.name}`,
            `Seat availability: ${seatAvailability} seats left`,
            `Route: ${selectedTrip.source} to ${selectedTrip.destination}`,
          ]}
        />

        <InfoCard
          title="Boarding and Arrival"
          items={[
            `Boarding points: ${boardingPoints.join(', ')}`,
            `Destination points: ${destinationPoints.join(', ')}`,
            `Distance covered: ${selectedTrip.distance_km} km`,
          ]}
        />
      </section>

      <InfoCard
        title="Available Time Slots"
        items={timeSlots.map((slot, index) => `Option ${index + 1}: ${slot}`)}
      />
    </ItineraryLayout>
  );
}

function InfoCard({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-[var(--ink)]">{title}</h2>
      <ul className="mt-4 space-y-3 text-sm text-[var(--muted)]">
        {items.map((item) => (
          <li key={item} className="rounded-2xl bg-[var(--panel-muted)] px-4 py-3">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <section className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--panel-muted)] p-8 text-center text-sm text-[var(--muted)]">
      {message}
    </section>
  );
}
