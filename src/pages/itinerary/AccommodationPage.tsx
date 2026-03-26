import ItineraryLayout from '../../components/ItineraryLayout';
import { useTripContext } from '../../context/TripContext';

const PRICE_BY_TIER = {
  budget: 1499,
  moderate: 2899,
  luxury: 4899,
} as const;

const AMENITIES_BY_TYPE: Record<string, string[]> = {
  budget: ['Free WiFi', 'Hot Water', 'Daily Housekeeping'],
  moderate: ['Air Conditioning', 'Free WiFi', 'Breakfast Included', 'Room Service'],
  luxury: ['Air Conditioning', 'Free WiFi', 'Breakfast Included', 'Pool Access', 'Room Service'],
};

export default function AccommodationPage() {
  const { selectedTrip } = useTripContext();

  if (!selectedTrip) {
    return (
      <ItineraryLayout title="Accommodation Details" previousPath="/budget-results">
        <EmptyState message="No itinerary selected. Please choose a budget plan first." />
      </ItineraryLayout>
    );
  }

  const nightlyPrice = PRICE_BY_TIER[selectedTrip.budget_type] ?? 2499;
  const hotelType = selectedTrip.result.hotel.type.trim().toLowerCase() || 'moderate';
  const amenities = AMENITIES_BY_TYPE[hotelType] ?? AMENITIES_BY_TYPE.moderate;
  const roomImages = [
    `https://placehold.co/800x500?text=${encodeURIComponent(selectedTrip.result.hotel.name + ' Room 1')}`,
    `https://placehold.co/800x500?text=${encodeURIComponent(selectedTrip.result.hotel.name + ' Room 2')}`,
  ];

  return (
    <ItineraryLayout
      title="Accommodation Details"
      previousPath="/itinerary/transport"
      nextPath="/itinerary/food"
    >
      <section className="grid gap-6 lg:grid-cols-[1.3fr,0.9fr]">
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--ink)]">
            {selectedTrip.result.hotel.name}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Room Type: {selectedTrip.result.hotel.type}
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--ink)]">
            {'\u20B9'}
            {nightlyPrice.toLocaleString('en-IN')} per night
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {roomImages.map((imageUrl) => (
              <img
                key={imageUrl}
                src={imageUrl}
                alt={selectedTrip.result.hotel.name}
                className="h-48 w-full rounded-2xl object-cover"
              />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--ink)]">Amenities</h2>
          <ul className="mt-4 space-y-3 text-sm text-[var(--muted)]">
            {amenities.map((amenity) => (
              <li key={amenity} className="rounded-2xl bg-[var(--panel-muted)] px-4 py-3">
                {amenity}
              </li>
            ))}
          </ul>
          <p className="mt-6 rounded-2xl bg-[var(--panel-muted)] px-4 py-3 text-sm text-[var(--muted)]">
            Payment note: Pay the first night online to confirm your stay. Remaining balance can
            be settled at check-in.
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
