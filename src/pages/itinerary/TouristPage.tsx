import ItineraryLayout from '../../components/ItineraryLayout';
import { useTripContext } from '../../context/TripContext';

export default function TouristPage() {
  const { selectedTrip } = useTripContext();

  if (!selectedTrip) {
    return (
      <ItineraryLayout title="Tourist Places" previousPath="/budget-results">
        <EmptyState message="No itinerary selected. Please choose a budget plan first." />
      </ItineraryLayout>
    );
  }

  const places = selectedTrip.result.tourist_places.map((place, index) => {
    const entryFee = index % 2 === 0 ? 100 + index * 50 : 0;

    return {
      place,
      entryFee,
      feeRequired: entryFee > 0,
    };
  });

  return (
    <ItineraryLayout
      title="Tourist Places"
      previousPath="/itinerary/food"
      nextPath="/itinerary/activities"
    >
      <section className="grid gap-6">
        {places.map(({ place, entryFee, feeRequired }) => (
          <article
            key={place}
            className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-[var(--ink)]">{place}</h2>
            <ul className="mt-4 space-y-3 text-sm text-[var(--muted)]">
              <li className="rounded-2xl bg-[var(--panel-muted)] px-4 py-3">
                {feeRequired
                  ? `Entry Fee: \u20B9${entryFee.toLocaleString('en-IN')}`
                  : 'Entry Fee: Free'}
              </li>
              <li className="rounded-2xl bg-[var(--panel-muted)] px-4 py-3">
                {feeRequired ? 'Entry Fee Required' : 'No entry fee required'}
              </li>
            </ul>
          </article>
        ))}
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
